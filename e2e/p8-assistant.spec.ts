import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env", "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => { const separator = line.indexOf("="); return [line.slice(0, separator), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")]; }));
const projectRef = new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0]; const authStorageKey = `sb-${projectRef}-auth-token`;
const userId = "10000000-0000-4000-8000-000000000001"; const workspaceId = "10000000-0000-4000-9000-000000000001"; const clientId = "20000000-0000-4000-8000-000000000001"; const projectId = "30000000-0000-4000-8000-000000000001"; const interactionId = "80000000-0000-4000-8000-000000000001"; const now = new Date().toISOString();
const session = { access_token: "p8-e2e-token", refresh_token: "p8-e2e-refresh", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user: { id: userId, aud: "authenticated", role: "authenticated", email: "p8-e2e@example.invalid", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: { full_name: "P8 E2E" }, identities: [], created_at: now, updated_at: now } };
const respond = (route: Route, body: unknown) => route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-0/1" }, body: JSON.stringify(body) });

async function authorize(page: Page) {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: authStorageKey, value: session });
  await page.route("**/auth/v1/**", (route) => respond(route, route.request().url().includes("/user") ? session.user : session));
  await page.route("**/api/assistant", (route) => respond(route, {
    interactionId, mode: "ai", model: "openai/gpt-5.6-luna",
    answer: "## Situação atual\nO projeto exige atenção por uma tarefa atrasada.",
    citations: [{ id: `client:${clientId}`, label: "Cliente: Grupo H2O", url: `/clientes/${clientId}` }],
    suggestedTasks: [{ title: "Validar conciliação", description: "Revisar as divergências financeiras.", priority: "high", dueDate: "2026-09-03", clientId, projectId, rationale: "A pendência foi registrada na última reunião.", sourceIds: [`client:${clientId}`] }],
  }));
  await page.route("**/rest/v1/**", (route) => {
    const table = new URL(route.request().url()).pathname.split("/").at(-1);
    if (table === "workspace_members") return respond(route, [{ workspace_id: workspaceId, user_id: userId, role: "admin", is_default: true }]);
    if (table === "workspaces") return respond(route, { id: workspaceId, name: "P8", slug: "p8" });
    if (table === "profiles") return respond(route, [{ id: userId, full_name: "P8 E2E" }]);
    if (table === "clients") return respond(route, [{ id: clientId, name: "Grupo H2O", trade_name: "Grupo H2O", workspace_id: workspaceId, created_at: now, updated_at: now }]);
    if (table === "projects") return respond(route, [{ id: projectId, name: "Consultoria H2O", client_id: clientId, workspace_id: workspaceId, status: "active", progress: 40, created_at: now, updated_at: now }]);
    return respond(route, []);
  });
}

test("P8 responde com fontes e exige revisão da tarefa sugerida no mobile", async ({ page }) => {
  await authorize(page); await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/assistente");
  await expect(page.getByRole("heading", { name: "Assistente JoIA" })).toBeVisible();
  await page.getByLabel("Pergunta para o Assistente JoIA").fill("Quais pendências exigem atenção?");
  await page.getByRole("button", { name: "Enviar pergunta" }).click();
  await expect(page.getByRole("heading", { name: "Situação atual" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Cliente: Grupo H2O/ })).toBeVisible();
  await expect(page.getByText("Validar conciliação")).toBeVisible();
  await page.getByRole("button", { name: "Revisar tarefa" }).click();
  await expect(page.getByRole("heading", { name: "Nova tarefa" })).toBeVisible();
  await expect(page.getByLabel("Título")).toHaveValue("Validar conciliação");
  await expect(page.getByText("Sugestão do Assistente JoIA", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
