import { describe, expect, test } from "bun:test";
import type { Client, Project, Task } from "@/types";
import { calculateDashboardMetrics, parseDashboardDate } from "./metrics";

const client = (overrides: Partial<Client>): Client => ({ id: "client", status: "ativo", ...overrides } as Client);
const project = (overrides: Partial<Project>): Project => ({ id: "project", status: "green", ...overrides } as Project);
const task = (overrides: Partial<Task>): Task => ({
  id: "task",
  projectId: "project",
  status: "backlog",
  dueDate: "",
  ...overrides,
} as Task);

describe("dashboard metrics", () => {
  test("interpreta datas brasileiras e ISO usadas pelos registros", () => {
    expect(parseDashboardDate("25/07/2026")?.getFullYear()).toBe(2026);
    expect(parseDashboardDate("2026-07-25T12:00:00Z")?.getUTCMonth()).toBe(6);
    expect(parseDashboardDate("data inválida")).toBeNull();
  });

  test("conta como concluídas no mês somente tarefas com data de conclusão no período", () => {
    const metrics = calculateDashboardMetrics([], [], [
      task({ id: "current", status: "done", completedAt: "2026-07-10T10:00:00Z" }),
      task({ id: "old", status: "done", completedAt: "2026-06-30T10:00:00Z" }),
      task({ id: "legacy", status: "done" }),
    ], new Date(2026, 6, 25));

    expect(metrics.completedThisMonth).toBe(1);
    expect(metrics.pendingTasks).toBe(0);
  });

  test("identifica projetos em risco por status ou tarefa vencida sem duplicar", () => {
    const metrics = calculateDashboardMetrics(
      [client({ id: "active" }), client({ id: "inactive", status: "inativo" })],
      [project({ id: "overdue" }), project({ id: "red", status: "red" }), project({ id: "healthy" })],
      [task({ projectId: "overdue", dueDate: "24/07/2026" })],
      new Date(2026, 6, 25),
    );

    expect(metrics).toMatchObject({ activeClients: 1, activeProjects: 3, projectsAtRisk: 2 });
  });
});
