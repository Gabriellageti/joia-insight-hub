import { ProjectDeliverable, Task } from "@/types";

export const DEFAULT_PHASES = ["Diagnóstico", "Quick wins", "Estruturação", "Cultura e treinamento", "Acompanhamento"];

const WEIGHTS = {
  tasks: 0.7,
  deliverables: 0.2,
  phases: 0.1,
} as const;

const clampPercentage = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

const calculateCompletionRatio = (completed: number, total: number) => {
  if (total <= 0) return null;
  return completed / total;
};

const isTaskCompleted = (task: Task) => task.status === "done" || task.status === "validation";

const isDeliverableCompleted = (deliverable: ProjectDeliverable) => deliverable.status === "done";

export function calculatePhaseProgress(currentPhase?: string, phases = DEFAULT_PHASES) {
  if (!currentPhase || phases.length === 0) return null;
  const index = phases.findIndex((phase) => phase.toLowerCase() === currentPhase.toLowerCase());
  if (index === -1) return null;
  if (phases.length === 1) return 1;
  return index / (phases.length - 1);
}

export interface WeightedProgressInput {
  tasks?: Task[];
  deliverables?: ProjectDeliverable[];
  currentPhase?: string;
  phaseSequence?: string[];
}

export function calculateWeightedProgress({
  tasks = [],
  deliverables = [],
  currentPhase,
  phaseSequence = DEFAULT_PHASES,
}: WeightedProgressInput) {
  const taskRatio = calculateCompletionRatio(
    tasks.filter(isTaskCompleted).length,
    tasks.length
  );
  const deliverableRatio = calculateCompletionRatio(
    deliverables.filter(isDeliverableCompleted).length,
    deliverables.length
  );
  const phaseRatio = calculatePhaseProgress(currentPhase, phaseSequence);

  const activeRatios: Partial<Record<keyof typeof WEIGHTS, number>> = {};
  if (taskRatio !== null) activeRatios.tasks = taskRatio;
  if (deliverableRatio !== null) activeRatios.deliverables = deliverableRatio;
  if (phaseRatio !== null) activeRatios.phases = phaseRatio;

  const activeEntries = Object.entries(activeRatios) as [keyof typeof WEIGHTS, number][];
  if (activeEntries.length === 0) return 0;

  const weightSum = activeEntries.reduce((sum, [key]) => sum + WEIGHTS[key], 0);

  const weightedProgress = activeEntries.reduce((total, [key, ratio]) => {
    const normalizedWeight = WEIGHTS[key] / weightSum;
    return total + ratio * normalizedWeight * 100;
  }, 0);

  return clampPercentage(weightedProgress);
}

export interface ProgressResolutionInput {
  computedProgress: number;
  overrideEnabled?: boolean;
  manualProgress?: number | null;
}

export function resolveProgressValue({ computedProgress, overrideEnabled, manualProgress }: ProgressResolutionInput) {
  if (overrideEnabled && typeof manualProgress === "number" && !Number.isNaN(manualProgress)) {
    return clampPercentage(manualProgress);
  }
  return clampPercentage(computedProgress);
}

export interface ProgressAuditPayload {
  projectName: string;
  overrideEnabled: boolean;
  manualProgress?: number | null;
  justification?: string;
  previousOverrideEnabled?: boolean;
  previousManualProgress?: number | null;
}

export function buildProgressAuditMessage({
  projectName,
  overrideEnabled,
  manualProgress,
  justification,
  previousManualProgress,
  previousOverrideEnabled,
}: ProgressAuditPayload) {
  const action = overrideEnabled ? "sobrescreveu" : "removeu a sobreposição de";
  const manualValue = overrideEnabled ? ` para ${clampPercentage(manualProgress ?? 0)}%` : "";
  const justificationText = overrideEnabled && justification ? ` Justificativa: ${justification.trim()}` : "";
  const previousText =
    typeof previousManualProgress === "number" && previousOverrideEnabled
      ? ` (anteriormente ${clampPercentage(previousManualProgress)}%)`
      : "";

  return `Usuário ${action} progresso do projeto "${projectName}"${manualValue}${previousText}.${justificationText}`.trim();
}
