import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";

const userId = "a0000000-0000-4000-8000-000000000001";
const workspaceId = "a0000000-0000-4000-8000-000000000002";
const ruleId = "a0000000-0000-4000-8000-000000000003";
const now = "2026-08-29T14:00:00.000Z";
const env = Object.fromEntries(readFileSync(".env", "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => { const separator = line.indexOf("="); return [line.slice(0, separator), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")]; }));
const projectRef = new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0]; const authStorageKey = `sb-${projectRef}-auth-token`;
const session = { access_token: "p10-token", refresh_token: "p10-refresh", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user: { id: userId, role: "authenticated", email: "p10@joia.test", user_metadata: { full_name: "Gestor P10" }, app_metadata: { provider: "email", providers: ["email"] }, identities: [], aud: "authenticated", created_at: now, updated_at: now } };

const respond = (route: Route, body: unknown) => route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-0/1" }, body: JSON.stringify(body) });

async function installBackend(page: Page) {
  await page.addInitScript(({ key, storedSession }) => localStorage.setItem(key, JSON.stringify(storedSession)), { key: authStorageKey, storedSession: session });
  await page.route("**/auth/v1/**", (route) => respond(route, route.request().url().includes("/user") ? session.user : session));
  await page.route("**/rest/v1/**", (route) => {
    const request = route.request(); const table = new URL(request.url()).pathname.split("/").at(-1);
    if (table === "workspace_members") return respond(route, [{ workspace_id: workspaceId, user_id: userId, role: "manager", is_default: true }]);
    if (table === "user_roles") return respond(route, []);
    if (table === "workspaces") return respond(route, { id: workspaceId, name: "P10", slug: "p10" });
    if (table === "profiles") return respond(route, [{ id: userId, full_name: "Gestor P10" }]);
    if (table === "automation_rules") return respond(route, request.method() === "PATCH" ? { enabled: false } : [{ id: ruleId, workspace_id: workspaceId, rule_key: "urgent_task_overdue", name: "Tarefa urgente atrasada", description: "Alerta o responsável.", event_type: "schedule.tick", action_type: "notify_assignee", condition_config: {}, action_config: {}, enabled: true, is_system: true, updated_at: now, updated_by: null }]);
    if (table === "automation_runs") return respond(route, [{ id: "a0000000-0000-4000-8000-000000000004", workspace_id: workspaceId, rule_id: ruleId, event_id: null, entity_type: "task", entity_id: null, idempotency_key: "p10", status: "success", result: { affected: 1 }, error_message: null, started_at: now, finished_at: now, duration_ms: 4 }]);
    if (table === "automation_connectors") return respond(route, [{ id: "a0000000-0000-4000-8000-000000000005", workspace_id: workspaceId, provider: "slack", label: "Slack", status: "planned", config: {}, updated_at: now, updated_by: null }]);
    if (table === "run_scheduled_automations") return respond(route, { executed: 1, deduplicated: 0, ran_at: now });
    return respond(route, []);
  });
}

test("gestor configura regras, consulta logs e executa o motor", async ({ page }) => {
  await installBackend(page);
  await page.goto("/automacoes");
  await expect(page.getByRole("heading", { name: "Automações" })).toBeVisible();
  await expect(page.getByText("Tarefa urgente atrasada")).toBeVisible();
  await page.getByRole("tab", { name: "Execuções" }).click();
  await expect(page.getByText("Sucesso")).toBeVisible();
  await page.getByRole("tab", { name: "Integrações" }).click();
  await expect(page.getByText("Slack")).toBeVisible();
  await page.getByRole("button", { name: "Executar agora" }).click();
  await expect(page.getByText(/1 execução/)).toBeVisible();
});
