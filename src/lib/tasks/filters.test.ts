import { describe, expect, test } from "bun:test";
import { filterTasks, type TaskFilterValues } from "./filters";
import type { Task } from "@/types";

const tasks = [
  { id: "1", title: "Revisar contrato", taskType: "project", projectId: "p1", assignedTo: "u1", status: "in_progress", priority: "urgent", dueDate: "2026-07-10" },
  { id: "2", title: "Organizar agenda", taskType: "personal", projectId: "", assignedTo: "u1", status: "done", priority: "low", dueDate: "2026-07-10" },
] as Task[];

const defaults: TaskFilterValues = { search: "", projectId: "all", status: "all", priority: "all", assignedTo: "all", taskType: "all", overdue: false };

describe("filterTasks", () => {
  test("combina busca, projeto, prioridade, responsável e tipo", () => {
    const result = filterTasks(tasks, { ...defaults, search: "contrato", projectId: "p1", priority: "urgent", assignedTo: "u1", taskType: "project" });
    expect(result.map((task) => task.id)).toEqual(["1"]);
  });

  test("considera atrasadas apenas tarefas não concluídas", () => {
    expect(filterTasks(tasks, { ...defaults, overdue: true }, new Date("2026-07-14T12:00:00Z")).map((task) => task.id)).toEqual(["1"]);
  });
});
