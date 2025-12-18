import { differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Diagnostic, DiagnosticTemplate } from "@/types";
import { formatDatePtBR, parseDatePtBR } from "@/lib/dates";

type Status = Diagnostic["status"];

type BaseDiagnosticInput = {
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  templateId: string;
  templateName: string;
  responsibleName?: string;
  responsibleId?: string;
  dueDate?: string;
  autoGenerateOpportunities?: boolean;
  name?: string;
};

export interface ApplyDiagnosticInput extends BaseDiagnosticInput {
  templateQuestionCount?: number;
}

export interface UpdateDiagnosticInput extends Partial<Diagnostic> {
  id: string;
}

const currentMonthLabel = () => format(new Date(), "MM/yyyy", { locale: ptBR });

const defaultName = (templateName: string, projectName: string, referenceDate: Date = new Date()) => {
  return `${templateName} • ${projectName} • ${format(referenceDate, "MM/yyyy", { locale: ptBR })}`;
};

const templateSeed: DiagnosticTemplate[] = [
  {
    id: "template-1",
    name: "Operações SaaS",
    tags: ["SaaS", "Operações", "Governança"],
    sections: [],
    questionCount: 82,
    sectionsCount: 7,
    estimatedTimeMinutes: 95,
    version: "v1.4",
    updatedAt: "05/02/2025",
  },
  {
    id: "template-2",
    name: "Diagnóstico de Compras",
    tags: ["Compras", "Supply", "Processos"],
    sections: [],
    questionCount: 42,
    sectionsCount: 4,
    estimatedTimeMinutes: 60,
    version: "v1.2",
    updatedAt: "12/01/2025",
  },
  {
    id: "template-3",
    name: "Diagnóstico de Estoque",
    tags: ["Estoque", "Logística"],
    sections: [],
    questionCount: 38,
    sectionsCount: 3,
    estimatedTimeMinutes: 45,
    version: "v1.0",
    updatedAt: "18/12/2024",
  },
  {
    id: "template-4",
    name: "Diagnóstico Financeiro",
    tags: ["Financeiro", "Riscos", "Controles"],
    sections: [],
    questionCount: 56,
    sectionsCount: 5,
    estimatedTimeMinutes: 80,
    version: "v1.1",
    updatedAt: "28/01/2025",
  },
];

const diagnosticsSeed: Diagnostic[] = [
  {
    id: "diagnostic-1",
    name: defaultName("Operações SaaS", "Implantação BI Operacional", parseDatePtBR("22/01/2025") || new Date()),
    projectId: "project-1",
    projectName: "Implantação BI Operacional",
    clientId: "client-1",
    clientName: "Alfa Tecnologia LTDA",
    templateId: "template-1",
    templateName: "Operações SaaS",
    status: "in_progress",
    progress: 55,
    score: undefined,
    opportunities: 7,
    createdAt: "22/01/2025",
    updatedAt: "12/02/2025",
    totalQuestions: 82,
    answeredQuestions: 45,
    autoGenerateOpportunities: true,
    responsibleName: "Marina Rocha",
    responsibleId: "employee-1",
    hasResponses: true,
    dueDate: "28/02/2025",
  },
  {
    id: "diagnostic-2",
    name: defaultName("Diagnóstico de Compras", "Expansão Marketplace", parseDatePtBR("10/02/2025") || new Date()),
    projectId: "project-2",
    projectName: "Expansão Marketplace",
    clientId: "client-2",
    clientName: "BetaLog Transportes",
    templateId: "template-2",
    templateName: "Diagnóstico de Compras",
    status: "draft",
    progress: 0,
    opportunities: 0,
    createdAt: "10/02/2025",
    updatedAt: "10/02/2025",
    totalQuestions: 42,
    answeredQuestions: 0,
    autoGenerateOpportunities: true,
    responsibleName: "Diego Carvalho",
    responsibleId: "employee-2",
    hasResponses: false,
    dueDate: "05/03/2025",
  },
  {
    id: "diagnostic-3",
    name: defaultName("Diagnóstico Financeiro", "PMO Transformação Financeira", parseDatePtBR("03/12/2024") || new Date()),
    projectId: "project-3",
    projectName: "PMO Transformação Financeira",
    clientId: "client-1",
    clientName: "Alfa Tecnologia LTDA",
    templateId: "template-4",
    templateName: "Diagnóstico Financeiro",
    status: "completed",
    progress: 100,
    score: 82,
    opportunities: 12,
    createdAt: "03/12/2024",
    updatedAt: "20/12/2024",
    totalQuestions: 56,
    answeredQuestions: 56,
    autoGenerateOpportunities: false,
    responsibleName: "Marina Rocha",
    responsibleId: "employee-1",
    hasResponses: true,
    dueDate: "15/01/2025",
  },
];

export const getDiagnosticsSeed = () => diagnosticsSeed;
export const getTemplatesSeed = () => templateSeed;

export const calculateDaysSinceUpdate = (dateString?: string): number => {
  const parsed = parseDatePtBR(dateString);
  if (!parsed) return 0;
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return differenceInCalendarDays(todayMidnight, parsed);
};

export const isDiagnosticStalled = (diagnostic: Diagnostic): boolean => {
  return diagnostic.status === "in_progress" && calculateDaysSinceUpdate(diagnostic.updatedAt) > 10;
};

export const calculatePendingQuestions = (diagnostic: Diagnostic): number => {
  return Math.max(0, (diagnostic.totalQuestions || 0) - (diagnostic.answeredQuestions || 0));
};

export const fetchDiagnostics = async (): Promise<Diagnostic[]> => {
  return diagnosticsSeed;
};

export const fetchTemplates = async (): Promise<DiagnosticTemplate[]> => {
  return templateSeed;
};

export const applyDiagnostic = async (input: ApplyDiagnosticInput): Promise<Diagnostic> => {
  const { templateName, projectName, templateQuestionCount } = input;
  const id = `diagnostic-${Math.random().toString(36).slice(2, 8)}`;
  const today = formatDatePtBR(new Date());
  const totalQuestions = templateQuestionCount ?? 40;

  return {
    id,
    name: input.name || defaultName(templateName, projectName),
    status: "in_progress",
    progress: 0,
    score: undefined,
    opportunities: 0,
    createdAt: today,
    updatedAt: today,
    answeredQuestions: 0,
    totalQuestions,
    hasResponses: false,
    autoGenerateOpportunities: input.autoGenerateOpportunities ?? true,
    responsibleName: input.responsibleName || "Equipe JoIA",
    responsibleId: input.responsibleId,
    dueDate: input.dueDate,
    ...input,
  };
};

export const updateDiagnostic = async (current: Diagnostic, payload: Partial<Diagnostic>): Promise<Diagnostic> => {
  return {
    ...current,
    ...payload,
    updatedAt: payload.updatedAt || formatDatePtBR(new Date()),
  };
};

export const createTemplateMock = (name?: string): DiagnosticTemplate => {
  const id = `template-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    name: name || "Template importado JoIA",
    tags: ["Exemplo", "Boas práticas"],
    sections: [],
    questionCount: 30,
    sectionsCount: 3,
    estimatedTimeMinutes: 45,
    version: "v1.0",
    updatedAt: format(new Date(), "dd/MM/yyyy", { locale: ptBR }),
  };
};

export const resolveStatusLabel = (status: Status) => {
  switch (status) {
    case "draft":
      return "Rascunho";
    case "in_progress":
      return "Em andamento";
    case "completed":
      return "Concluído";
    default:
      return status;
  }
};

export const formatRelativeUpdate = (diagnostic: Diagnostic): string => {
  const days = calculateDaysSinceUpdate(diagnostic.updatedAt);
  if (days <= 0) return "Atualizado hoje";
  if (days === 1) return "Atualizado há 1 dia";
  return `Atualizado há ${days} dias`;
};

export const getDefaultDiagnosticName = (templateName: string, projectName: string) =>
  defaultName(templateName, projectName, new Date());
