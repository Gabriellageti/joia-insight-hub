import { differenceInCalendarDays, startOfDay } from "date-fns";
import { parseTaskDate } from "./dates";
import type { Task } from "@/types";

export interface TaskRiskSignal {
  atRisk: boolean;
  reason?: string;
  blockedDays?: number;
  staleBlock: boolean;
}

export function getTaskRiskSignal(task: Task, now = new Date(), staleBlockDays = 3): TaskRiskSignal {
  if (task.status === "done") return { atRisk: false, staleBlock: false };
  if (task.status === "blocked") {
    const blockedAt = task.blockedAt ? new Date(task.blockedAt) : null;
    const blockedDays = blockedAt && !Number.isNaN(blockedAt.getTime()) ? Math.max(0, differenceInCalendarDays(startOfDay(now), startOfDay(blockedAt))) : undefined;
    return { atRisk: true, reason: task.blockReason || "Tarefa bloqueada", blockedDays, staleBlock: typeof blockedDays === "number" && blockedDays >= staleBlockDays };
  }
  const due = parseTaskDate(task.dueDate);
  const days = due ? differenceInCalendarDays(startOfDay(due), startOfDay(now)) : null;
  if (days !== null && days < 0) return { atRisk: true, reason: "Prazo vencido", staleBlock: false };
  if (task.priority === "urgent") return { atRisk: true, reason: "Prioridade urgente", staleBlock: false };
  if (days !== null && days <= 3 && task.status === "not_started") return { atRisk: true, reason: "Prazo próximo sem início", staleBlock: false };
  return { atRisk: false, staleBlock: false };
}
