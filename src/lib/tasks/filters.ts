import { parseTaskDate } from "./dates";
import type { Task } from "@/types";

export interface TaskFilterValues {
  search: string;
  clientId: string;
  projectId: string;
  status: string;
  priority: string;
  assignedTo: string;
  taskType: string;
  due: "all" | "today" | "overdue" | "next_7_days" | "no_due";
  mine: boolean;
}

export function filterTasks(tasks: Task[], filters: TaskFilterValues, now = new Date(), userId?: string): Task[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const search = filters.search.trim().toLocaleLowerCase("pt-BR");

  return tasks.filter((task) => {
    if (filters.mine && task.assignedTo !== userId) return false;
    if (search && ![task.title, task.description, task.clientName, task.projectName, task.responsible].some((value) => value?.toLocaleLowerCase("pt-BR").includes(search))) return false;
    if (filters.clientId !== "all" && task.clientId !== filters.clientId) return false;
    if (filters.projectId !== "all" && task.projectId !== filters.projectId) return false;
    if (filters.status !== "all" && task.status !== filters.status) return false;
    if (filters.priority !== "all" && task.priority !== filters.priority) return false;
    if (filters.assignedTo !== "all" && task.assignedTo !== filters.assignedTo) return false;
    if (filters.taskType !== "all" && task.taskType !== filters.taskType) return false;
    const dueDate = parseTaskDate(task.dueDate);
    if (filters.due === "overdue" && (!dueDate || dueDate >= today || task.status === "done")) return false;
    if (filters.due === "today" && (!dueDate || dueDate.getTime() !== today.getTime())) return false;
    if (filters.due === "no_due" && dueDate) return false;
    if (filters.due === "next_7_days") {
      const limit = new Date(today);
      limit.setDate(limit.getDate() + 7);
      if (!dueDate || dueDate < today || dueDate > limit || task.status === "done") return false;
    }
    return true;
  });
}
