import { differenceInCalendarDays, isAfter, parse, compareAsc } from "date-fns";
import { Client, Contract, Document, Indicator, Meeting, Project, Task } from "@/types";

const STATUS_LABELS: Record<Project["status"], string> = {
  green: "Verde",
  yellow: "Amarelo",
  red: "Vermelho",
};

const parseFlexibleDate = (value?: string): Date | null => {
  if (!value) return null;
  const parsed = parse(value, "dd/MM/yyyy", new Date());
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const getLastDate = (dates: (Date | null)[]) =>
  dates.filter((date): date is Date => Boolean(date)).sort((a, b) => (isAfter(a, b) ? -1 : 1))[0] || null;

const countOverdueTasks = (tasks: Task[], today: Date) =>
  tasks.filter((task) => {
    if (!task.dueDate) return false;
    const dueDate = parseFlexibleDate(task.dueDate);
    if (!dueDate) return false;
    const isCompleted = task.status === "done" || task.status === "validation";
    return !isCompleted && differenceInCalendarDays(today, dueDate) > 0;
  }).length;

const getLastEvidenceDate = (documents: Document[], projectId: string) =>
  getLastDate(
    documents
      .filter((doc) => doc.projectId === projectId && doc.category === "evidências")
      .map((doc) => parseFlexibleDate(doc.createdAt))
  );

const getLastCompletedMeetingDate = (meetings: Meeting[], projectId: string) =>
  getLastDate(
    meetings
      .filter((meeting) => meeting.projectId === projectId && meeting.status === "completed")
      .map((meeting) => parseFlexibleDate(meeting.date))
  );

const hasOverduePayments = (contracts: Contract[], projectId: string, clientId: string, today: Date) =>
  contracts.some((contract) => {
    const belongsToProject = contract.projectId === projectId || (!contract.projectId && contract.clientId === clientId);
    if (!belongsToProject) return false;

    return contract.installments.some((installment) => {
      if (installment.status === "overdue") return true;
      const dueDate = parseFlexibleDate(installment.dueDate);
      return installment.status === "pending" && dueDate && differenceInCalendarDays(today, dueDate) > 0;
    });
  });

const findPrimaryIndicator = (indicators: Indicator[], projectId: string) => {
  const projectIndicators = indicators.filter((indicator) => indicator.projectId === projectId);
  if (projectIndicators.length === 0) return null;
  return projectIndicators.find((indicator) => indicator.isPrimary) ?? projectIndicators[0];
};

const isPrimaryIndicatorWorsening = (indicators: Indicator[], projectId: string) => {
  const indicator = findPrimaryIndicator(indicators, projectId);
  if (!indicator || typeof indicator.target !== "number" || indicator.values.length < 3) return false;

  const sortedValues = [...indicator.values]
    .map((entry) => ({ ...entry, parsedDate: parseFlexibleDate(entry.date) }))
    .sort((a, b) => compareAsc(a.parsedDate || new Date(a.date), b.parsedDate || new Date(b.date)));

  const recentValues = sortedValues.slice(-3);
  if (recentValues.length < 3) return false;

  const distances = recentValues.map((entry) => Math.abs(entry.value - indicator.target!));
  return distances[2] > distances[1] && distances[1] > distances[0];
};

const shouldRestoreAutomaticStatus = (project: Project, today: Date) => {
  if (!project.statusOverrideEnabled || !project.statusOverrideExpiresAt) return false;
  const expiresAt = parseFlexibleDate(project.statusOverrideExpiresAt);
  if (!expiresAt) return false;
  return differenceInCalendarDays(today, expiresAt) >= 0;
};

export interface AutomaticStatusParams {
  project: Project;
  tasks: Task[];
  meetings: Meeting[];
  indicators: Indicator[];
  documents: Document[];
  contracts: Contract[];
  client?: Client;
  today?: Date;
}

export interface AutomaticStatusResult {
  status: Project["status"];
  reason: string;
}

export const calculateAutomaticProjectStatus = ({
  project,
  tasks,
  meetings,
  indicators,
  documents,
  contracts,
  client,
  today = new Date(),
}: AutomaticStatusParams): AutomaticStatusResult => {
  const attentionReasons: string[] = [];
  const criticalReasons: string[] = [];

  const overdueTasks = countOverdueTasks(tasks, today);
  if (overdueTasks >= 3) {
    criticalReasons.push(`${overdueTasks} tarefas atrasadas`);
  } else if (overdueTasks >= 1) {
    attentionReasons.push(`${overdueTasks} tarefa${overdueTasks > 1 ? "s" : ""} atrasada${overdueTasks > 1 ? "s" : ""}`);
  }

  const lastEvidenceDate = getLastEvidenceDate(documents, project.id);
  if (lastEvidenceDate) {
    const daysSince = differenceInCalendarDays(today, lastEvidenceDate);
    if (daysSince > 10) {
      attentionReasons.push(`Última evidência há ${daysSince} dias`);
    }
  }

  const cadenceConfigured = Boolean(client?.preferenciasRelacionamento?.frequencia);
  if (cadenceConfigured) {
    const lastCompletedMeeting = getLastCompletedMeetingDate(meetings, project.id);
    const daysSinceMeeting = lastCompletedMeeting ? differenceInCalendarDays(today, lastCompletedMeeting) : null;
    if (!lastCompletedMeeting || (daysSinceMeeting !== null && daysSinceMeeting > 15)) {
      attentionReasons.push(
        daysSinceMeeting !== null ? `Última reunião há ${daysSinceMeeting} dias` : "Nenhuma reunião realizada recentemente"
      );
    }
  }

  if (hasOverduePayments(contracts, project.id, project.clientId, today)) {
    criticalReasons.push("Pagamento em atraso");
  }

  if (isPrimaryIndicatorWorsening(indicators, project.id)) {
    criticalReasons.push("KPI principal piorando há 2 períodos");
  }

  if (criticalReasons.length > 0) {
    return { status: "red", reason: criticalReasons[0] };
  }

  if (attentionReasons.length > 0) {
    return { status: "yellow", reason: attentionReasons[0] };
  }

  return { status: "green", reason: "Sem alertas críticos" };
};

export interface ResolvedStatusResult extends AutomaticStatusResult {
  source: "calculated" | "manual";
  overrideExpired: boolean;
}

export const resolveProjectStatus = (params: AutomaticStatusParams): ResolvedStatusResult => {
  const today = params.today ?? new Date();
  const overrideExpired = shouldRestoreAutomaticStatus(params.project, today);
  const overrideActive =
    params.project.statusOverrideEnabled &&
    !overrideExpired &&
    Boolean(params.project.statusOverrideValue);

  if (overrideActive) {
    return {
      status: params.project.statusOverrideValue!,
      reason: params.project.statusOverrideJustification?.trim() || "Status forçado manualmente",
      source: "manual",
      overrideExpired,
    };
  }

  const automatic = calculateAutomaticProjectStatus(params);
  return { ...automatic, source: "calculated", overrideExpired };
};

export const buildStatusAuditMessage = ({
  projectName,
  overrideEnabled,
  overrideValue,
  justification,
  expiresAt,
  previousOverrideEnabled,
  previousOverrideValue,
  expired,
  author,
}: {
  projectName: string;
  overrideEnabled: boolean;
  overrideValue?: Project["status"] | null;
  justification?: string;
  expiresAt?: string;
  previousOverrideEnabled?: boolean;
  previousOverrideValue?: Project["status"] | null;
  expired?: boolean;
  author?: string;
}) => {
  const statusLabel = overrideValue ? STATUS_LABELS[overrideValue] : "";

  if (overrideEnabled && overrideValue && (overrideEnabled !== previousOverrideEnabled || overrideValue !== previousOverrideValue)) {
    const expirationText = expiresAt ? ` até ${expiresAt}` : "";
    const authorText = author ? ` por ${author}` : "";
    return `Status do projeto "${projectName}" forçado para ${statusLabel}${authorText}${expirationText}. Motivo: ${justification || "sem justificativa"}`;
  }

  if (!overrideEnabled && previousOverrideEnabled) {
    if (expired) {
      return `Override de status do projeto "${projectName}" expirou em ${expiresAt || "data não informada"} e o status voltou ao cálculo automático.`;
    }
    return `Status do projeto "${projectName}" voltou para o cálculo automático${overrideValue ? " (remoção de override)" : ""}.`;
  }

  return null;
};
