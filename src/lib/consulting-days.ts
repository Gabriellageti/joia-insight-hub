import { parseTaskDate } from "@/lib/tasks/dates";
import type { Task } from "@/types";

export type ConsultingDaySituation = "not_started" | "in_progress" | "done" | "overdue";

export interface ConsultingDayMetrics {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  progress: number;
  situation: ConsultingDaySituation;
}

export function isMainConsultingTask(task: Task): boolean {
  return Boolean(task.sourceActionId && /^.+-dia-[0-9]+$/.test(task.sourceActionId));
}

export function getConsultingDayMetrics(tasks: Task[], now = new Date()): ConsultingDayMetrics {
  const deliverables = tasks.filter((task) => !isMainConsultingTask(task));
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const completed = deliverables.filter((task) => task.status === "done").length;
  const overdue = deliverables.filter((task) => {
    const dueDate = parseTaskDate(task.dueDate);
    return task.status !== "done" && Boolean(dueDate && dueDate < today);
  }).length;
  const total = deliverables.length;
  const pending = total - completed;
  const started = deliverables.some((task) => task.status !== "not_started");
  const situation: ConsultingDaySituation = overdue > 0
    ? "overdue"
    : total > 0 && completed === total
      ? "done"
      : completed > 0 || started
        ? "in_progress"
        : "not_started";

  return {
    total,
    completed,
    pending,
    overdue,
    progress: total === 0 ? 0 : Math.round((completed / total) * 100),
    situation,
  };
}

const priorityOrder: Record<Task["priority"], number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export function sortConsultingTasks(tasks: Task[]): Task[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = (task: Task) => {
    const dueDate = parseTaskDate(task.dueDate);
    return task.status !== "done" && Boolean(dueDate && dueDate < today);
  };

  return [...tasks].sort((a, b) => {
    const aImportedOrder = a.sourceActionId?.match(/-tarefa-(\d+)$/)?.[1];
    const bImportedOrder = b.sourceActionId?.match(/-tarefa-(\d+)$/)?.[1];
    if (aImportedOrder && bImportedOrder && Number(aImportedOrder) !== Number(bImportedOrder)) {
      return Number(aImportedOrder) - Number(bImportedOrder);
    }
    if (isOverdue(a) !== isOverdue(b)) return isOverdue(a) ? -1 : 1;
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) return priorityOrder[a.priority] - priorityOrder[b.priority];
    const aDue = parseTaskDate(a.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bDue = parseTaskDate(b.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (aDue !== bDue) return aDue - bDue;
    return (a.updatedAt || a.createdAt).localeCompare(b.updatedAt || b.createdAt);
  });
}
