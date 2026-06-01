import { describe, expect, test } from "vitest";
import { buildProgressAuditMessage, calculateWeightedProgress, resolveProgressValue } from "./progress";
import { ProjectDeliverable, Task } from "../../types";

const createTask = (overrides: Partial<Task>): Task => ({
  id: overrides.id || "task-id",
  title: overrides.title || "Task",
  projectId: overrides.projectId || "project-1",
  projectName: overrides.projectName || "Projeto",
  clientId: overrides.clientId || "client-1",
  clientName: overrides.clientName || "Cliente",
  type: overrides.type || "processo",
  responsible: overrides.responsible || "Responsável",
  priority: overrides.priority || "medium",
  dueDate: overrides.dueDate || "01/01/2025",
  status: overrides.status || "done",
  evidenceRequired: overrides.evidenceRequired ?? false,
  impact: overrides.impact,
  description: overrides.description,
  createdAt: overrides.createdAt || "01/01/2025",
  checklist: overrides.checklist,
  evidenceFile: overrides.evidenceFile,
  what: overrides.what,
  why: overrides.why,
  where: overrides.where,
  when: overrides.when,
  who: overrides.who,
  how: overrides.how,
  howMuch: overrides.howMuch,
});

const createDeliverable = (overrides: Partial<ProjectDeliverable>): ProjectDeliverable => ({
  id: overrides.id || "deliverable-id",
  projectId: overrides.projectId || "project-1",
  title: overrides.title || "Entregável",
  status: overrides.status || "pending",
  dueDate: overrides.dueDate,
  createdAt: overrides.createdAt || "01/01/2025",
});

describe("calculateWeightedProgress", () => {
  test("applies default weights when todas as categorias estão presentes", () => {
    const tasks = [
      createTask({ status: "done" }),
      createTask({ status: "done" }),
      createTask({ status: "backlog" }),
      createTask({ status: "in_progress" }),
    ];
    const deliverables = [
      createDeliverable({ status: "done" }),
      createDeliverable({ status: "pending" }),
    ];

    const progress = calculateWeightedProgress({
      tasks,
      deliverables,
      currentPhase: "Estruturação",
    });

    expect(progress).toBe(50);
  });

  test("renormaliza pesos quando não existem entregáveis", () => {
    const tasks = [createTask({ status: "done" }), createTask({ status: "backlog" })];

    const progress = calculateWeightedProgress({
      tasks,
      deliverables: [],
      currentPhase: "Quick wins",
    });

    expect(progress).toBe(47);
  });

  test("renormaliza pesos quando fases não são informadas", () => {
    const tasks = [createTask({ status: "done" })];
    const deliverables = [createDeliverable({ status: "done" }), createDeliverable({ status: "pending" })];

    const progress = calculateWeightedProgress({
      tasks,
      deliverables,
      currentPhase: undefined,
    });

    expect(progress).toBe(89);
  });

  test("retorna 0% quando não há itens para calcular", () => {
    const progress = calculateWeightedProgress({
      tasks: [],
      deliverables: [],
      currentPhase: undefined,
    });

    expect(progress).toBe(0);
  });
});

describe("resolveProgressValue", () => {
  test("utiliza o valor manual quando override está ativo", () => {
    const progress = resolveProgressValue({
      computedProgress: 80,
      overrideEnabled: true,
      manualProgress: 55,
    });

    expect(progress).toBe(55);
  });

  test("mantém cálculo automático quando override está desativado", () => {
    const progress = resolveProgressValue({
      computedProgress: 72.4,
      overrideEnabled: false,
      manualProgress: 90,
    });

    expect(progress).toBe(72);
  });
});

describe("buildProgressAuditMessage", () => {
  test("registra justificativa ao ativar override", () => {
    const message = buildProgressAuditMessage({
      projectName: "Projeto Alfa",
      overrideEnabled: true,
      manualProgress: 65,
      justification: "Ajuste alinhado ao steering",
    });

    expect(message).toContain("sobrescreveu progresso");
    expect(message).toContain("65%");
    expect(message).toContain("Justificativa");
  });

  test("registra remoção de override", () => {
    const message = buildProgressAuditMessage({
      projectName: "Projeto Alfa",
      overrideEnabled: false,
      manualProgress: null,
      previousManualProgress: 80,
      previousOverrideEnabled: true,
    });

    expect(message).toContain("removeu a sobreposição");
    expect(message).toContain("anteriormente 80%");
  });
});
