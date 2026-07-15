import { parseTaskDate } from "./dates";
import type { Task } from "@/types";

export interface TaskFilterValues {
  search: string;
  projectId: string;
  status: string;
  priority: string;
  assignedTo: string;
  taskType: string;
  overdue: boolean;
}

export function filterTasks(tasks: Task[], filters: TaskFilterValues, now = new Date()): Task[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const search = filters.search.trim().toLocaleLowerCase("pt-BR");

  return tasks.filter((task) => {
    if (search && !task.title.toLocaleLowerCase("pt-BR").includes(search)) return false;
    if (filters.projectId !== "all" && task.projectId !== filters.projectId) return false;
    if (filters.status !== "all" && task.status !== filters.status) return false;
    if (filters.priority !== "all" && task.priority !== filters.priority) return false;
    if (filters.assignedTo !== "all" && task.assignedTo !== filters.assignedTo) return false;
    if (filters.taskType !== "all" && task.taskType !== filters.taskType) return false;
    if (filters.overdue) {
      const dueDate = parseTaskDate(task.dueDate);
      if (!dueDate || dueDate >= today || task.status === "done") return false;
    }
    return true;
  });
}
