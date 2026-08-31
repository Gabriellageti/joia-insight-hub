import { describe, expect, test } from "bun:test";
import type { Client, Project, Task } from "@/types";
import { daysOverdue, filterMyTasks, getClientsNeedingAttention, getMyDayBuckets, getProjectsNeedingAttention, sortDailyPriorities } from "./my-day";

const userId = "user-1";
const base = { projectId: "project-1", projectName: "Ciclo 3", clientId: "client-1", clientName: "Grupo H2O", type: "processo", responsible: "Gabriel", taskType: "project", assignedTo: userId, startDate: "", evidenceRequired: false, createdAt: "2026-08-20T12:00:00Z" } as const;
const task = (id: string, dueDate: string, status: Task["status"], priority: Task["priority"], completedAt?: string): Task => ({ ...base, id, title: id, dueDate, status, priority, completedAt });
const now = new Date(2026, 7, 28, 12);

describe("Meu Dia", () => {
  test("separa hoje, atrasadas, futuras, bloqueadas e concluídas hoje", () => {
    const tasks = [task("today", "2026-08-28", "not_started", "medium"), task("late", "2026-08-25", "blocked", "high"), task("future", "2026-08-30", "waiting", "low"), task("done", "2026-08-20", "done", "high", "2026-08-28T10:00:00Z")];
    const buckets = getMyDayBuckets(tasks, userId, now);
    expect(buckets.today.map(({ id }) => id)).toEqual(["today"]);
    expect(buckets.overdue.map(({ id }) => id)).toEqual(["late"]);
    expect(buckets.upcoming.map(({ id }) => id)).toEqual(["future"]);
    expect(buckets.blocked.map(({ id }) => id)).toEqual(["late"]);
    expect(buckets.completedToday.map(({ id }) => id)).toEqual(["done"]);
    expect(daysOverdue(tasks[1], now)).toBe(3);
  });

  test("ordena prioridades pela regra operacional solicitada", () => {
    const tasks = [task("high-today", "2026-08-28", "not_started", "high"), task("urgent-today", "2026-08-28", "not_started", "urgent"), task("high-late", "2026-08-26", "not_started", "high"), task("urgent-late", "2026-08-27", "not_started", "urgent")];
    expect(sortDailyPriorities(tasks, now).map(({ id }) => id)).toEqual(["urgent-late", "urgent-today", "high-late", "high-today"]);
  });

  test("mantém Minhas Tarefas sobre a mesma base", () => {
    const tasks = [task("mine", "2026-08-28", "in_progress", "medium"), { ...task("other", "2026-08-28", "in_progress", "high"), assignedTo: "user-2" }];
    expect(filterMyTasks(tasks, "in_progress", userId, now).map(({ id }) => id)).toEqual(["mine"]);
  });

  test("sinaliza clientes e projetos por regras objetivas", () => {
    const tasks = [task("late", "2026-08-25", "not_started", "urgent"), task("blocked", "2026-08-30", "blocked", "medium")];
    const clients = [{ id: "client-1", razaoSocial: "Grupo H2O", segmentoTags: [], status: "ativo", contatoPrincipal: { nome: "" }, endereco: {}, preferenciasRelacionamento: {}, projects: 1, nps: 0, risk: "low", lastContact: "", createdAt: "" }] as Client[];
    const projects = [{ id: "project-1", name: "Ciclo 3", clientId: "client-1", clientName: "Grupo H2O", phase: "Execução", progress: 30, progressOverrideEnabled: false, manualProgress: null, status: "yellow", responsible: "Gabriel", startDate: "2026-08-01", endDate: "2026-08-30", createdAt: "2026-08-01" }] as Project[];
    expect(getClientsNeedingAttention(tasks, clients, now)[0].reasons).toContain("1 tarefa atrasada");
    expect(getProjectsNeedingAttention(tasks, projects, now)[0].reasons).toContain("prazo do projeto próximo");
  });
});
