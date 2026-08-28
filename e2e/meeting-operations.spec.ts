import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env", "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => { const separator = line.indexOf("="); return [line.slice(0, separator), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")]; }));
const projectRef = new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0];
const authStorageKey = `sb-${projectRef}-auth-token`;
const userId = "10000000-0000-4000-8000-000000000001";
const workspaceId = "10000000-0000-4000-9000-000000000001";
const clientId = "20000000-0000-4000-8000-000000000001";
const projectId = "30000000-0000-4000-8000-000000000001";
const meetingId = "70000000-0000-4000-8000-000000000001";
const now = new Date().toISOString();
const session = { access_token: "e2e-access-token", refresh_token: "e2e-refresh-token", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user: { id: userId, aud: "authenticated", role: "authenticated", email: "meetings-e2e@example.invalid", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: { full_name: "Responsável E2E" }, identities: [], created_at: now, updated_at: now } };
const respond = (route: Route, body: unknown) => route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-0/1" }, body: JSON.stringify(body) });

async function installMeetingBackend(page: Page) {
  let revision = 0;
  const meeting = { id: meetingId, title: "Comitê operacional", project_id: projectId, client_id: clientId, workspace_id: workspaceId, date: now, end_date: new Date(Date.now() + 3600000).toISOString(), duration: "60", participants: [], agenda: null, minutes: null, decisions: null, status: "Agendada", location: null, meeting_link: "https://meet.example.invalid", notes: null, started_at: null, ended_at: null, responsible_user_id: userId, created_by: userId, updated_by: userId, completed_by: null, created_at: now, updated_at: now };
  const agenda: Record<string, unknown>[] = [];
  const decisions: Record<string, unknown>[] = [];
  const nextSteps: Record<string, unknown>[] = [];
  const activities: Record<string, unknown>[] = [];
  const mutations: string[] = [];
  const objectResponse = (request: { headers(): Record<string, string> }, value: unknown) => request.headers().accept?.includes("application/vnd.pgrst.object+json") ? value : [value];
  const stamp = () => new Date(Date.now() + (++revision * 1000)).toISOString();

  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: authStorageKey, value: session });
  await page.route("**/auth/v1/**", (route) => route.request().url().includes("/user") ? respond(route, session.user) : respond(route, session));
  await page.route("**/rest/v1/**", (route) => {
    const request = route.request(); const url = new URL(request.url()); const table = url.pathname.split("/").at(-1);
    if (table === "workspace_members") return respond(route, [{ workspace_id: workspaceId, user_id: userId, role: "admin", is_default: true }]);
    if (table === "workspaces") return respond(route, { id: workspaceId, name: "Workspace E2E", slug: "workspace-e2e" });
    if (table === "profiles") return respond(route, [{ id: userId, full_name: "Responsável E2E" }]);
    if (table === "project_members") return respond(route, [{ project_id: projectId, user_id: userId, access_level: "manager" }]);
    if (table === "clients") return respond(route, [{ id: clientId, name: "Grupo H2O", status: "ativo", created_at: now, updated_at: now, workspace_id: workspaceId }]);
    if (table === "projects") return respond(route, [{ id: projectId, name: "Consultoria Ciclo 3", client_id: clientId, phase: "Estruturação", progress: 40, responsible: "Responsável E2E", status: "Em andamento", created_at: now, updated_at: now, workspace_id: workspaceId }]);
    if (table === "meetings") {
      if (request.method() === "PATCH") { Object.assign(meeting, request.postDataJSON(), { updated_at: stamp() }); mutations.push(`MEETING:${meeting.status}`); activities.unshift({ id: `a-${revision}`, workspace_id: workspaceId, actor_id: userId, action_type: "meeting_updated", entity_type: "meeting", entity_id: meetingId, client_id: clientId, project_id: projectId, meeting_id: meetingId, task_id: null, title: meeting.title, description: `Status ${meeting.status}`, metadata: {}, created_at: meeting.updated_at }); return respond(route, objectResponse(request, meeting)); }
      return respond(route, request.headers().accept?.includes("application/vnd.pgrst.object+json") ? meeting : [meeting]);
    }
    const collection = table === "meeting_agenda_items" ? agenda : table === "meeting_decisions" ? decisions : table === "meeting_next_steps" ? nextSteps : null;
    if (collection) {
      if (request.method() === "POST") { const row = { id: `${table}-${collection.length + 1}`, created_at: stamp(), updated_at: stamp(), created_by: userId, ...request.postDataJSON() }; collection.push(row); mutations.push(`POST:${table}`); return respond(route, objectResponse(request, row)); }
      if (request.method() === "PATCH") { const row = collection[0]; if (row) Object.assign(row, request.postDataJSON(), { updated_at: stamp() }); return respond(route, objectResponse(request, row)); }
      return respond(route, collection);
    }
    if (table === "meeting_participants" || table === "documents" || table === "tasks") return respond(route, []);
    if (table === "activity_logs") return respond(route, activities);
    return respond(route, []);
  });
  return { meeting, mutations };
}

test("reunião operacional persiste pauta, notas, decisões, ações e conclusão", async ({ page }) => {
  const backend = await installMeetingBackend(page);
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.goto(`/reunioes/${meetingId}`);
  await expect(page.getByRole("heading", { name: "Comitê operacional" })).toBeVisible();
  await page.getByRole("button", { name: "Iniciar reunião" }).click();
  await expect(page.getByText("Em andamento", { exact: true }).first()).toBeVisible();

  await page.getByPlaceholder("Novo item de pauta").fill("Aprovar cronograma");
  await page.getByRole("button", { name: "Adicionar item" }).click();
  await expect(page.locator('input[value="Aprovar cronograma"]')).toBeVisible();
  await page.getByPlaceholder("O que foi decidido?").fill("Cronograma aprovado para setembro");
  await page.getByRole("button", { name: "Adicionar decisão" }).click();
  await expect(page.locator("textarea").nth(2)).toHaveValue("Cronograma aprovado para setembro");

  await page.getByPlaceholder("Próximo passo").fill("Enviar cronograma final");
  await page.getByRole("button", { name: "Adicionar próximo passo" }).click();
  await expect(page.getByText("Enviar cronograma final", { exact: true })).toBeVisible();
  await page.getByPlaceholder("Registre contexto, observações e pontos relevantes...").fill("Cliente validou o cronograma e os responsáveis.");
  await expect(page.getByText("Alterações não salvas")).toBeVisible();
  await expect(page.getByText("Alterações salvas")).toBeVisible({ timeout: 5000 });

  await page.getByRole("button", { name: "Finalizar" }).click();
  await page.getByRole("button", { name: "Concluir mesmo assim" }).click();
  await expect(page.getByText("Resumo da reunião")).toBeVisible();
  expect(backend.meeting.status).toBe("Realizada");
  expect(backend.mutations).toContain("POST:meeting_agenda_items");
  expect(backend.mutations).toContain("POST:meeting_decisions");
  expect(backend.mutations).toContain("POST:meeting_next_steps");

  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(consoleErrors).toEqual([]);
});
