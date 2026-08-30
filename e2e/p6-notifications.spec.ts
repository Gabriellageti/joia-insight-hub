import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env", "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => { const separator = line.indexOf("="); return [line.slice(0, separator), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")]; }));
const projectRef = new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0];
const authStorageKey = `sb-${projectRef}-auth-token`;
const userId = "10000000-0000-4000-8000-000000000001";
const workspaceId = "10000000-0000-4000-9000-000000000001";
const now = new Date().toISOString();
const session = { access_token: "p6-e2e-token", refresh_token: "p6-e2e-refresh", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user: { id: userId, aud: "authenticated", role: "authenticated", email: "p6-e2e@example.invalid", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: { full_name: "P6 E2E" }, identities: [], created_at: now, updated_at: now } };
const respond = (route: Route, body: unknown) => route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-1/2" }, body: JSON.stringify(body) });

async function authorize(page: Page) {
  const notifications = [
    { id: "notification-1", workspace_id: workspaceId, user_id: userId, notification_type: "overdue", title: "Tarefa atrasada", body: "Auditoria Financeira", task_id: "task-1", client_id: null, project_id: null, meeting_id: null, dedupe_key: "overdue:task-1", priority: "urgent", action_url: "/plano-acao?taskId=task-1", read_at: null, resolved_at: null, delivery_channels: ["in_app"], created_at: now },
    { id: "notification-2", workspace_id: workspaceId, user_id: userId, notification_type: "meeting_upcoming", title: "Reunião próxima", body: "Revisão semanal", task_id: null, client_id: null, project_id: null, meeting_id: "meeting-1", dedupe_key: "meeting-upcoming:meeting-1", priority: "attention", action_url: "/reunioes/meeting-1", read_at: now, resolved_at: null, delivery_channels: ["in_app"], created_at: now },
  ];
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: authStorageKey, value: session });
  await page.route("**/auth/v1/**", (route) => respond(route, route.request().url().includes("/user") ? session.user : session));
  await page.route("**/rest/v1/**", (route) => {
    const table = new URL(route.request().url()).pathname.split("/").at(-1);
    if (table === "workspace_members") return respond(route, [{ workspace_id: workspaceId, user_id: userId, role: "admin", is_default: true }]);
    if (table === "workspaces") return respond(route, { id: workspaceId, name: "P6", slug: "p6" });
    if (table === "profiles") return respond(route, [{ id: userId, full_name: "P6 E2E" }]);
    if (table === "internal_notifications") return respond(route, notifications);
    if (table === "refresh_my_notifications") return respond(route, 2);
    return respond(route, []);
  });
}

test("P6 filtra alertas, mostra prioridade e ação no mobile", async ({ page }) => {
  await authorize(page); await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/meu-dia");
  await page.getByRole("button", { name: "1 notificações não lidas" }).click();
  await expect(page.getByRole("tab", { name: "Novas (1)" })).toBeVisible();
  await expect(page.getByText("Tarefa atrasada", { exact: true })).toBeVisible();
  await expect(page.getByText("Urgente", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Lidas" }).click();
  await expect(page.getByText("Reunião próxima", { exact: true })).toBeVisible();
  await expect(page.getByText("Atenção", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
