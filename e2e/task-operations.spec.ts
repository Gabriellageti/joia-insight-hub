import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env", "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => { const separator = line.indexOf("="); return [line.slice(0, separator), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")]; }));
const projectRef = new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0];
const authStorageKey = `sb-${projectRef}-auth-token`;
const userId = "10000000-0000-4000-8000-000000000001";
const workspaceId = "10000000-0000-4000-9000-000000000001";
const clientId = "20000000-0000-4000-8000-000000000001";
const projectId = "30000000-0000-4000-8000-000000000001";
const initialTaskId = "40000000-0000-4000-8000-000000000001";
const now = "2026-08-28T12:00:00.000Z";

const session = { access_token: "e2e-access-token", refresh_token: "e2e-refresh-token", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user: { id: userId, aud: "authenticated", role: "authenticated", email: "operacoes-e2e@example.invalid", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: { full_name: "Responsável E2E" }, identities: [], created_at: now, updated_at: now } };

const respond = (route: Route, body: unknown) => route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-0/1" }, body: JSON.stringify(body) });

const expectNoDocumentOverflow = async (page: Page) => {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
};

async function installTaskBackend(page: Page) {
  const tasks = [{ id: initialTaskId, title: "Auditoria financeira", description: "Validar fechamento", project_id: projectId, client_id: clientId, type: "financeiro", responsible: "Responsável E2E", priority: "high", task_type: "project", assigned_to: userId, start_date: null, due_date: "2026-08-27", status: "not_started", evidence_required: false, evidence_url: null, what: null, why: null, where_location: null, when_date: null, who: null, how: null, how_much: null, created_at: now, updated_at: now, source_diagnostic_id: null, source_action_id: null, consulting_day: null, created_by: userId, completed_at: null, completed_by: null, previous_status: null, observations: "", workspace_id: workspaceId }];
  const mutations: string[] = [];

  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: authStorageKey, value: session });
  await page.route("**/auth/v1/**", (route) => route.request().url().includes("/user") ? respond(route, session.user) : respond(route, session));
  await page.route("**/rest/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.split("/").at(-1);
    if (table === "workspace_members") return respond(route, [{ workspace_id: workspaceId, user_id: userId, role: "admin", is_default: true }]);
    if (table === "workspaces") return respond(route, { id: workspaceId, name: "Workspace E2E", slug: "workspace-e2e" });
    if (table === "profiles") return respond(route, [{ id: userId, full_name: "Responsável E2E", email: session.user.email }]);
    if (table === "project_members") return respond(route, [{ project_id: projectId, user_id: userId, access_level: "manager" }]);
    if (table === "clients") return respond(route, [{ id: clientId, name: "Grupo H2O", cnpj: null, segment: "Serviços", status: "ativo", contact_name: "Contato", contact_email: null, contact_phone: null, created_at: now, updated_at: now, workspace_id: workspaceId }]);
    if (table === "projects") return respond(route, [{ id: projectId, name: "Consultoria Ciclo 3", client_id: clientId, objective: null, scope: null, phase: "Estruturação", project_type: "consulting", progress: 20, responsible: "Responsável E2E", start_date: "2026-08-01", end_date: "2026-10-31", money_hypothesis: null, status: "Em andamento", created_at: now, updated_at: now, workspace_id: workspaceId }]);
    if (table === "tasks") {
      if (request.method() === "GET") return respond(route, tasks);
      if (request.method() === "PATCH") {
        const id = url.searchParams.get("id")?.replace("eq.", "") || initialTaskId;
        const task = tasks.find((item) => item.id === id);
        if (!task) return respond(route, null);
        Object.assign(task, request.postDataJSON(), { updated_at: new Date().toISOString() });
        mutations.push(`PATCH:${id}`);
        return respond(route, task);
      }
      if (request.method() === "POST") {
        const payload = request.postDataJSON();
        const task = { ...tasks[0], ...payload, id: "40000000-0000-4000-8000-000000000002", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        tasks.push(task);
        mutations.push(`POST:${task.id}`);
        return respond(route, task);
      }
      if (request.method() === "DELETE") {
        const id = url.searchParams.get("id")?.replace("eq.", "");
        const index = tasks.findIndex((item) => item.id === id);
        if (index >= 0) tasks.splice(index, 1);
        mutations.push(`DELETE:${id}`);
        return respond(route, []);
      }
    }
    return respond(route, []);
  });
  return { tasks, mutations };
}

test("CRUD e persistência do Kanban usam o mesmo registro", async ({ page }) => {
  const backend = await installTaskBackend(page);
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.goto("/plano-acao");
  await expect(page.getByRole("heading", { name: "Plano de Ação" })).toBeVisible();
  await expect(page.getByText("Auditoria financeira", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Bloqueada/ })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await expectNoDocumentOverflow(page);
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.getByText("Auditoria financeira", { exact: true }).click();
  await page.getByLabel("Título *").fill("Auditoria financeira revisada");
  await page.getByLabel("Observações").fill("Revisão E2E");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Auditoria financeira revisada", { exact: true })).toBeVisible();

  const card = page.getByText("Auditoria financeira revisada", { exact: true }).locator("xpath=ancestor::*[@role='button'][1]");
  const inProgress = page.locator('section[aria-labelledby="column-in_progress"]');
  const cardBox = await card.boundingBox();
  const targetBox = await inProgress.boundingBox();
  if (!cardBox || !targetBox) throw new Error("Kanban card or target column is not visible");
  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(cardBox.x + cardBox.width / 2 + 20, cardBox.y + cardBox.height / 2, { steps: 4 });
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(inProgress.getByText("Auditoria financeira revisada", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('section[aria-labelledby="column-in_progress"]').getByText("Auditoria financeira revisada", { exact: true })).toBeVisible();

  await page.getByText("Auditoria financeira revisada", { exact: true }).click();
  await page.getByRole("combobox", { name: "Status", exact: true }).click();
  await page.getByRole("option", { name: "Bloqueada" }).click();
  await expect(page.getByLabel("Motivo do bloqueio *")).toBeVisible();
  await page.getByLabel("Motivo do bloqueio *").fill("Aguardando liberação externa");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  const blockedColumn = page.locator('section[aria-labelledby="column-blocked"]');
  await expect(blockedColumn.getByText("Auditoria financeira revisada", { exact: true })).toBeVisible();

  await page.getByLabel("Filtrar por cliente").click(); await page.getByRole("option", { name: "Grupo H2O" }).click();
  await page.getByLabel("Filtrar por projeto").click(); await page.getByRole("option", { name: "Consultoria Ciclo 3" }).click();
  await page.getByLabel("Filtrar por responsável").click(); await page.getByRole("option", { name: "Responsável E2E" }).click();
  await expect(page.getByText("Auditoria financeira revisada", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Nova tarefa" }).click();
  await page.getByLabel("Título *").fill("Nova tarefa H2O");
  await page.getByLabel("Tipo da tarefa *").click(); await page.getByRole("option", { name: "Projeto" }).click();
  await page.getByLabel("Cliente *").click(); await page.getByRole("option", { name: "Grupo H2O" }).click();
  await page.getByLabel("Projeto *").click(); await page.getByRole("option", { name: "Consultoria Ciclo 3" }).click();
  await page.getByLabel("Responsável *").click(); await page.getByRole("option", { name: "Responsável E2E" }).click();
  await page.getByRole("textbox", { name: "Prazo", exact: true }).fill("2026-09-05");
  await page.getByRole("button", { name: "Criar tarefa" }).click();
  await expect(page.getByText("Nova tarefa H2O", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Excluir tarefa Nova tarefa H2O", exact: true }).click();
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(page.getByText("Nova tarefa H2O", { exact: true })).toHaveCount(0);
  await page.goto(`/clientes/${clientId}`);
  await expect(page.getByRole("heading", { name: "Grupo H2O" })).toBeVisible();
  await page.getByRole("tab", { name: "Kanban" }).click();
  await expect(page.getByText("Auditoria financeira revisada", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await expectNoDocumentOverflow(page);
  await page.goto(`/projetos/${projectId}`);
  await expect(page.getByRole("heading", { name: "Consultoria Ciclo 3" })).toBeVisible();
  await page.getByRole("tab", { name: "Kanban" }).click();
  await expect(page.getByText("Auditoria financeira revisada", { exact: true })).toBeVisible();
  await expectNoDocumentOverflow(page);
  expect(backend.mutations.some((item) => item.startsWith("POST:"))).toBe(true);
  expect(backend.mutations.some((item) => item.startsWith("DELETE:"))).toBe(true);
  expect(backend.tasks[0].status).toBe("blocked");
  expect((backend.tasks[0] as typeof backend.tasks[0] & { block_reason?: string }).block_reason).toBe("Aguardando liberação externa");
  expect(consoleErrors).toEqual([]);
});
