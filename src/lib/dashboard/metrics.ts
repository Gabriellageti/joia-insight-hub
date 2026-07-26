import type { Client, Project, Task } from "@/types";

export interface DashboardMetrics {
  activeClients: number;
  activeProjects: number;
  projectsAtRisk: number;
  completedThisMonth: number;
  pendingTasks: number;
}

export function parseDashboardDate(value?: string): Date | null {
  if (!value) return null;

  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function calculateDashboardMetrics(
  clients: Client[],
  projects: Project[],
  tasks: Task[],
  now = new Date(),
): DashboardMetrics {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const firstDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const projectsWithOverdueTasks = new Set<string>();

  for (const task of tasks) {
    const dueDate = parseDashboardDate(task.dueDate);
    if (task.status !== "done" && dueDate && dueDate < today) {
      projectsWithOverdueTasks.add(task.projectId);
    }
  }

  return {
    activeClients: clients.filter((client) => client.status === "ativo").length,
    activeProjects: projects.length,
    projectsAtRisk: projects.filter(
      (project) => project.status !== "green" || projectsWithOverdueTasks.has(project.id),
    ).length,
    completedThisMonth: tasks.filter((task) => {
      if (task.status !== "done") return false;
      const completedAt = parseDashboardDate(task.completedAt);
      return completedAt !== null && completedAt >= firstDayOfMonth && completedAt < firstDayOfNextMonth;
    }).length,
    pendingTasks: tasks.filter((task) => task.status !== "done").length,
  };
}
