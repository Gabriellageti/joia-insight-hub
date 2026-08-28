import type { Client, Project, Task } from "@/types";
import { parseTaskDate } from "@/lib/tasks/dates";
import { TASK_PRIORITY_ORDER } from "@/lib/tasks/constants";

export type MyTaskFilter = "today" | "overdue" | "in_progress" | "waiting" | "blocked" | "upcoming" | "completed";

export interface MyDayBuckets {
  today: Task[];
  overdue: Task[];
  upcoming: Task[];
  inProgress: Task[];
  waiting: Task[];
  blocked: Task[];
  completedToday: Task[];
  pending: Task[];
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function isCompletedOn(task: Task, date: Date) {
  if (task.status !== "done" || !task.completedAt) return false;
  const completed = new Date(task.completedAt);
  return !Number.isNaN(completed.getTime()) && localDateKey(completed) === localDateKey(date);
}

export function getMyDayBuckets(tasks: Task[], userId: string | undefined, now = new Date()): MyDayBuckets {
  const today = startOfDay(now);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const mine = tasks.filter((task) => task.assignedTo === userId);
  const pending = mine.filter((task) => task.status !== "done");
  const dueTime = (task: Task) => parseTaskDate(task.dueDate)?.getTime();
  const byDue = (a: Task, b: Task) => (dueTime(a) ?? Number.MAX_SAFE_INTEGER) - (dueTime(b) ?? Number.MAX_SAFE_INTEGER)
    || TASK_PRIORITY_ORDER[a.priority] - TASK_PRIORITY_ORDER[b.priority];

  return {
    today: pending.filter((task) => dueTime(task) === today.getTime()).sort(byDue),
    overdue: pending.filter((task) => (dueTime(task) ?? Number.MAX_SAFE_INTEGER) < today.getTime()).sort(byDue),
    upcoming: pending.filter((task) => {
      const due = dueTime(task);
      return due !== undefined && due > today.getTime() && due <= nextWeek.getTime();
    }).sort(byDue),
    inProgress: pending.filter((task) => task.status === "in_progress").sort(byDue),
    waiting: pending.filter((task) => task.status === "waiting").sort(byDue),
    blocked: pending.filter((task) => task.status === "blocked").sort(byDue),
    completedToday: mine.filter((task) => isCompletedOn(task, now)).sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || "")),
    pending: [...pending].sort(byDue),
  };
}

export function sortDailyPriorities(tasks: Task[], now = new Date()) {
  const today = startOfDay(now).getTime();
  const rank = (task: Task) => {
    const due = parseTaskDate(task.dueDate)?.getTime();
    const overdue = due !== undefined && due < today;
    const isToday = due === today;
    if (task.priority === "urgent" && overdue) return 0;
    if (task.priority === "urgent" && isToday) return 1;
    if (task.priority === "high" && overdue) return 2;
    if (task.priority === "high" && isToday) return 3;
    return 4;
  };
  return [...tasks].filter((task) => task.status !== "done").sort((a, b) => {
    const rankDifference = rank(a) - rank(b);
    if (rankDifference) return rankDifference;
    const dueDifference = (parseTaskDate(a.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER)
      - (parseTaskDate(b.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER);
    return dueDifference || TASK_PRIORITY_ORDER[a.priority] - TASK_PRIORITY_ORDER[b.priority];
  });
}

export const daysOverdue = (task: Task, now = new Date()) => {
  const due = parseTaskDate(task.dueDate);
  if (!due || task.status === "done") return 0;
  return Math.max(0, Math.floor((startOfDay(now).getTime() - due.getTime()) / 86_400_000));
};

export function filterMyTasks(tasks: Task[], filter: MyTaskFilter, userId: string | undefined, now = new Date()) {
  const buckets = getMyDayBuckets(tasks, userId, now);
  if (filter === "today") return buckets.today;
  if (filter === "overdue") return buckets.overdue;
  if (filter === "in_progress") return buckets.inProgress;
  if (filter === "waiting") return buckets.waiting;
  if (filter === "blocked") return buckets.blocked;
  if (filter === "upcoming") return buckets.upcoming;
  return tasks.filter((task) => task.assignedTo === userId && task.status === "done");
}

export interface AttentionItem {
  id: string;
  name: string;
  clientName?: string;
  progress?: number;
  pendingCount: number;
  reasons: string[];
}

export function getClientsNeedingAttention(tasks: Task[], clients: Client[], limit = 5): AttentionItem[] {
  const open = tasks.filter((task) => task.status !== "done" && task.clientId);
  return clients.flatMap((client) => {
    const related = open.filter((task) => task.clientId === client.id);
    const overdue = related.filter((task) => daysOverdue(task) > 0).length;
    const urgent = related.filter((task) => task.priority === "urgent").length;
    const blocked = related.filter((task) => task.status === "blocked").length;
    const reasons = [
      overdue ? `${overdue} ${overdue === 1 ? "tarefa atrasada" : "tarefas atrasadas"}` : "",
      urgent ? `${urgent} ${urgent === 1 ? "atividade urgente" : "atividades urgentes"}` : "",
      blocked >= 2 ? `${blocked} tarefas bloqueadas` : "",
    ].filter(Boolean);
    return reasons.length ? [{ id: client.id, name: client.nomeFantasia || client.razaoSocial || client.name || "Cliente", pendingCount: related.length, reasons }] : [];
  }).sort((a, b) => b.pendingCount - a.pendingCount).slice(0, limit);
}

export function getProjectsNeedingAttention(tasks: Task[], projects: Project[], now = new Date(), limit = 5): AttentionItem[] {
  const today = startOfDay(now);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  return projects.flatMap((project) => {
    const related = tasks.filter((task) => task.projectId === project.id && task.status !== "done");
    const overdue = related.filter((task) => daysOverdue(task, now) > 0).length;
    const blocked = related.filter((task) => task.status === "blocked").length;
    const endDate = parseTaskDate(project.endDate);
    const dueSoon = Boolean(endDate && endDate >= today && endDate <= nextWeek);
    const latestActivity = related.reduce((latest, task) => Math.max(latest, new Date(task.updatedAt || task.createdAt).getTime() || 0), 0);
    const inactive = related.length > 0 && latestActivity > 0 && today.getTime() - latestActivity > 7 * 86_400_000;
    const reasons = [
      overdue ? `${overdue} ${overdue === 1 ? "tarefa atrasada" : "tarefas atrasadas"}` : "",
      blocked ? `${blocked} ${blocked === 1 ? "tarefa bloqueada" : "tarefas bloqueadas"}` : "",
      dueSoon ? "prazo do projeto próximo" : "",
      inactive ? "sem atividade recente" : "",
      related.length >= 8 ? `${related.length} tarefas pendentes` : "",
    ].filter(Boolean);
    return reasons.length ? [{ id: project.id, name: project.name, clientName: project.clientName, progress: project.progress, pendingCount: related.length, reasons }] : [];
  }).sort((a, b) => b.pendingCount - a.pendingCount).slice(0, limit);
}
