import { describe, expect, test } from "bun:test";
import { validateTask } from "./validation";
import type { Project } from "@/types";

const projects = [{ id: "project-1" }] as Project[];

describe("validateTask", () => {
  test("permite tarefa pessoal sem projeto", () => {
    expect(validateTask({ title: "Revisar agenda", taskType: "personal", assignedTo: "user-1" }, projects)).toEqual({});
  });

  test("exige projeto válido para tarefa de projeto", () => {
    expect(validateTask({ title: "Entrega", taskType: "project", assignedTo: "user-1" }, projects).projectId).toBeTruthy();
    expect(validateTask({ title: "Entrega", taskType: "project", projectId: "unknown", assignedTo: "user-1" }, projects).projectId).toBeTruthy();
  });

  test("permite atualizar somente o status de tarefa de projeto ainda não atribuída", () => {
    expect(
      validateTask(
        { title: "Entrega", taskType: "project", projectId: "project-1", status: "done" },
        projects,
        { requireAssignee: false },
      ),
    ).toEqual({});
  });

  test("rejeita prazo anterior ao início", () => {
    const errors = validateTask({ title: "Entrega", taskType: "personal", assignedTo: "user-1", startDate: "2026-07-15", dueDate: "2026-07-14" }, projects);
    expect(errors.dueDate).toBeTruthy();
  });
});
