import type { Task } from "@/types";

export const TASK_STATUSES: { id: Task["status"]; label: string }[] = [
  { id: "not_started", label: "Não iniciada" },
  { id: "in_progress", label: "Em andamento" },
  { id: "waiting", label: "Aguardando" },
  { id: "blocked", label: "Bloqueada" },
  { id: "done", label: "Concluída" },
];

export const TASK_STATUS_LABELS = Object.fromEntries(
  TASK_STATUSES.map(({ id, label }) => [id, label]),
) as Record<Task["status"], string>;

export const TASK_PRIORITY_LABELS: Record<Task["priority"], string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

export const TASK_PRIORITY_ORDER: Record<Task["priority"], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};
