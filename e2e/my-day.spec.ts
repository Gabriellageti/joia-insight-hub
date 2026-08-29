import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env", "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => { const separator = line.indexOf("="); return [line.slice(0, separator), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")]; }));
const projectRef = new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0];
const authStorageKey = `sb-${projectRef}-auth-token`;
const userId = "10000000-0000-4000-8000-000000000001";
const workspaceId = "10000000-0000-4000-9000-000000000001";
const clientId = "20000000-0000-4000-8000-000000000001";
const projectId = "30000000-0000-4000-8000-000000000001";
const today = new Date();
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const addDays = (days: number) => { const date = new Date(today.getFullYear(), today.getMonth(), today.getDate()); date.setDate(date.getDate() + days); return dateKey(date); };
const now = today.toISOString();

const session = { access_token: "e2e-access-token", refresh_token: "e2e-refresh-token", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user: { id: userId, aud: "authenticated", role: "authenticated", email: "gabriel-e2e@example.invalid", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: { full_name: "Gabriel Operações" }, identities: [], created_at: now, updated_at: now } };
const respond = (route: Route, body: unknown) => route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-0/1" }, body: JSON.stringify(body) });

const makeTask = (id: string, title: string, dueDate: string, status: string, priority: string, completedAt: string | null = null) => ({ id, title, description: null, project_id: projectId, client_id: clientId, type: "processo", responsible: "Gabriel Operações", priority, task_type: "project", assigned_to: userId, start_date: null, due_date: dueDate, status, evidence_required: false, evidence_url: null, what: null, why: null, where_location: null, when_date: null, who: null, how: null, how_much: null, created_at: now, updated_at: now, source_diagnostic_id: null, source_action_id: null, consulting_day: null, created_by: userId, completed_at: completedAt, completed_by: completedAt ? userId : null, previous_status: completedAt ? "in_progress" : null, observations: null, workspace_id: workspaceId });

async function installMyDayBackend(page: Page) {
  const tasks = [
    makeTask("40000000-0000-4000-8000-000000000001", "Preparar reunião", addDays(0), "not_started", "urgent"),
    makeTask("40000000-0000-4000-8000-000000000002", "Auditoria financeira", addDays(-3), "blocked", "high"),
    makeTask("40000000-0000-4000-8000-000000000003", "Revisar processos", addDays(2), "waiting", "medium"),
    makeTask("40000000-0000-4000-8000-000000000004", "Enviar diagnóstico", addDays(0), "done", "high", now),
  ];
  const focus: Record<string, unknown>[] = [];
  let checkin: Record<string, unknown> | null = null;
  const mutations: string[] = [];
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: authStorageKey, value: session });
  await page.route("**/auth/v1/**", (route) => route.request().url().includes("/user") ? respond(route, session.user) : respond(route, session));
  await page.route("**/rest/v1/**", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.split("/").at(-1);
    if (table === "refresh_my_task_notifications") return respond(route, 0);
    if (table === "workspace_members") return respond(route, [{ workspace_id: workspaceId, user_id: userId, role: "admin", is_default: true }]);
    if (table === "workspaces") return respond(route, { id: workspaceId, name: "Workspace E2E", slug: "workspace-e2e" });
    if (table === "profiles") return respond(route, [{ id: userId, full_name: "Gabriel Operações", email: session.user.email }]);
    if (table === "project_members") return respond(route, [{ project_id: projectId, user_id: userId, access_level: "manager" }]);
    if (table === "clients") return respond(route, [{ id: clientId, name: "Grupo H2O", segment: "Serviços", status: "ativo", created_at: now, updated_at: now, workspace_id: workspaceId }]);
    if (table === "projects") return respond(route, [{ id: projectId, name: "Consultoria Ciclo 3", client_id: clientId, phase: "Execução", project_type: "consulting", progress: 40, responsible: "Gabriel Operações", start_date: addDays(-30), end_date: addDays(5), status: "Em andamento", created_at: now, updated_at: now, workspace_id: workspaceId }]);
    if (table === "tasks") {
      if (request.method() === "GET") return respond(route, tasks);
      if (request.method() === "PATCH") {
        const id = url.searchParams.get("id")?.replace("eq.", "");
        const task = tasks.find((item) => item.id === id);
        if (!task) return respond(route, null);
        Object.assign(task, request.postDataJSON(), { updated_at: new Date().toISOString() });
        mutations.push(`TASK:${id}:${task.status}`);
        return respond(route, task);
      }
    }
    if (table === "daily_focus_tasks") {
      if (request.method() === "GET") return respond(route, focus);
      if (request.method() === "POST") {
        const payload = request.postDataJSON();
        const row = { id: "50000000-0000-4000-8000-000000000001", created_at: now, updated_at: now, ...payload };
        focus.push(row); mutations.push("FOCUS:ADD"); return respond(route, row);
      }
      if (request.method() === "PATCH") { mutations.push("FOCUS:MOVE"); return respond(route, []); }
      if (request.method() === "DELETE") { focus.splice(0, focus.length); mutations.push("FOCUS:REMOVE"); return respond(route, []); }
    }
    if (table === "daily_checkins") {
      if (request.method() === "GET") return respond(route, checkin);
      if (request.method() === "POST") { checkin = { id: "60000000-0000-4000-8000-000000000001", created_at: now, updated_at: now, ...request.postDataJSON() }; mutations.push(checkin.ended_at ? "CHECKIN:END" : "CHECKIN:START"); return respond(route, checkin); }
    }
    if (table === "task_history" || table === "internal_notifications") return respond(route, []);
    return respond(route, []);
  });
  return { tasks, focus, mutations, getCheckin: () => checkin };
}

test("Meu Dia mantém foco, check-in e status na mesma base", async ({ page }) => {
  const backend = await installMyDayBackend(page);
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.goto("/meu-dia");
  await expect(page.getByRole("heading", { name: /Bom dia|Boa tarde|Boa noite/ })).toContainText("Gabriel");
  await expect(page.getByText(/1 tarefa.*para hoje e.*1 atrasadas/)).toBeVisible();
  await expect(page.getByText("Atrasada há 3 dias").first()).toBeVisible();
  await expect(page.getByText("Grupo H2O", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("Consultoria Ciclo 3", { exact: true }).last()).toBeVisible();

  await page.getByTestId("my-day-task-40000000-0000-4000-8000-000000000001").first().getByRole("button", { name: "Foco" }).click();
  await expect(page.getByText("1/5")).toBeVisible();
  await page.reload();
  await expect(page.getByText("1/5")).toBeVisible();

  await page.getByRole("button", { name: "Começar meu dia" }).click();
  await page.getByLabel("Prioridade e observação do dia").fill("Finalizar a preparação da reunião.");
  await page.getByRole("button", { name: "Começar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Dia iniciado" })).toBeDisabled();

  const todaySection = page.locator('section[aria-labelledby="today-title"]');
  const todayTask = todaySection.getByTestId("my-day-task-40000000-0000-4000-8000-000000000001");
  await todayTask.getByRole("button", { name: "Iniciar" }).click();
  await expect(todayTask.getByText("Em andamento", { exact: true })).toBeVisible();
  await todayTask.getByRole("button", { name: "Concluir" }).click();
  await expect(page.getByText("2 de 2 tarefas concluídas")).toBeVisible();
  await page.reload();
  await expect(page.getByText("2 de 2 tarefas concluídas")).toBeVisible();

  await page.getByRole("button", { name: "Encerrar meu dia" }).click();
  await page.getByLabel("Observações do dia").fill("Reunião preparada; auditoria segue bloqueada.");
  await page.getByRole("button", { name: "Encerrar", exact: true }).click();
  expect(backend.getCheckin()?.end_notes).toContain("auditoria");

  await page.goto("/minhas-tarefas");
  await page.getByRole("tab", { name: "Bloqueadas" }).click();
  await expect(page.getByText("Auditoria financeira", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(backend.mutations).toContain("FOCUS:ADD");
  expect(backend.mutations).toContain("CHECKIN:START");
  expect(backend.mutations).toContain("CHECKIN:END");
  expect(backend.mutations.some((item) => item.endsWith(":done"))).toBe(true);
  expect(consoleErrors).toEqual([]);
});
