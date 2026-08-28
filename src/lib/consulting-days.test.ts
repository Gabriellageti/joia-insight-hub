import { describe, expect, test } from "bun:test";
import { getConsultingDayMetrics, isMainConsultingTask, sortConsultingTasks } from "./consulting-days";
import type { Task } from "@/types";

const task = (overrides: Partial<Task>): Task => ({
  id: overrides.id || crypto.randomUUID(),
  title: "Tarefa",
  projectId: "p1",
  projectName: "Projeto",
  clientId: "c1",
  clientName: "Cliente",
  type: "processo",
  responsible: "Pessoa",
  priority: "medium",
  taskType: "project",
  assignedTo: "u1",
  dueDate: "",
  status: "not_started",
  evidenceRequired: false,
  createdAt: "2026-07-15",
  createdBy: "u1",
  consultingDay: 1,
  ...overrides,
});

describe("consulting day metrics", () => {
  test("separa a reunião principal dos entregáveis", () => {
    expect(isMainConsultingTask(task({ sourceActionId: "h2o-ciclo3-dia-1" }))).toBe(true);
    expect(isMainConsultingTask(task({ sourceActionId: "h2o-ciclo3-dia-1-entregavel-1" }))).toBe(false);
  });

  test("calcula progresso somente com entregáveis", () => {
    const tasks = [
      task({ sourceActionId: "h2o-ciclo3-dia-1", status: "done" }),
      task({ id: "a", sourceActionId: "h2o-ciclo3-dia-1-entregavel-1", status: "done" }),
      task({ id: "b", sourceActionId: "h2o-ciclo3-dia-1-entregavel-2", status: "in_progress" }),
    ];
    expect(getConsultingDayMetrics(tasks, new Date("2026-07-15T12:00:00"))).toEqual({
      total: 2, completed: 1, pending: 1, overdue: 0, progress: 50, situation: "in_progress",
    });
  });

  test("marca o dia com atraso e não conta tarefas concluídas como vencidas", () => {
    const result = getConsultingDayMetrics([
      task({ id: "a", dueDate: "2026-07-14", status: "in_progress" }),
      task({ id: "b", dueDate: "2026-07-13", status: "done" }),
    ], new Date("2026-07-15T12:00:00"));
    expect(result.overdue).toBe(1);
    expect(result.situation).toBe("overdue");
  });

  test("ordena por atraso, prioridade e prazo", () => {
    const result = sortConsultingTasks([
      task({ id: "normal", priority: "medium", dueDate: "2099-07-20" }),
      task({ id: "urgent", priority: "urgent", dueDate: "2099-07-21" }),
      task({ id: "late", priority: "low", dueDate: "2020-01-01" }),
    ]);
    expect(result.map((item) => item.id)).toEqual(["late", "urgent", "normal"]);
  });

  test("preserva a ordem estável das tarefas importadas", () => {
    const result = sortConsultingTasks([
      task({ id: "third", sourceActionId: "h2o-ciclo3-dia-1-tarefa-03" }),
      task({ id: "first", sourceActionId: "h2o-ciclo3-dia-1-tarefa-01" }),
      task({ id: "second", sourceActionId: "h2o-ciclo3-dia-1-tarefa-02" }),
    ]);

    expect(result.map((item) => item.id)).toEqual(["first", "second", "third"]);
  });
});
