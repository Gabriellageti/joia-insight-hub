import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env", "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => { const separator = line.indexOf("="); return [line.slice(0, separator), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")]; }));
const projectRef = new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0]; const authStorageKey = `sb-${projectRef}-auth-token`;
const userId = "19000000-0000-4000-8000-000000000001"; const workspaceId = "19000000-0000-4000-9000-000000000001"; const leadId = "29000000-0000-4000-8000-000000000001"; const now = new Date().toISOString();
const session = { access_token: "p9-e2e-token", refresh_token: "p9-e2e-refresh", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user: { id: userId, aud: "authenticated", role: "authenticated", email: "p9-e2e@example.invalid", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: { full_name: "Comercial E2E" }, identities: [], created_at: now, updated_at: now } };
const lead = { id: leadId, workspace_id: workspaceId, name: "Ana Compras", company: "Empresa Horizonte", email: "ana@example.invalid", phone: "31999999999", source: "Indicação", status: "proposal", notes: "Busca consultoria de processos", assigned_to: null, created_at: now, updated_at: now, value: 48000, next_action: "Revisar proposta", next_action_date: "2026-09-03", service: "Consultoria Empresarial", probability: 65, stage: "proposal", responsible_user_id: userId, expected_close_date: "2026-09-15", lost_reason: null, won_at: null, lost_at: null, converted_client_id: null, converted_project_id: null, created_by: userId };
const activity = { id: "39000000-0000-4000-8000-000000000001", workspace_id: workspaceId, lead_id: leadId, activity_type: "meeting", title: "Reunião de diagnóstico", description: "Escopo inicial validado.", happened_at: now, created_by: userId, metadata: {}, created_at: now };
const proposal = { id: "49000000-0000-4000-8000-000000000001", workspace_id: workspaceId, lead_id: leadId, value: 48000, scope: "Diagnóstico e plano de ação", proposal_date: "2026-08-28", valid_until: "2026-09-15", status: "sent", created_by: userId, created_at: now, updated_at: now };
const followUp = { id: "59000000-0000-4000-8000-000000000001", workspace_id: workspaceId, lead_id: leadId, responsible_user_id: userId, action: "Revisar proposta", due_at: "2026-09-03T13:00:00.000Z", completed_at: null, completed_by: null, created_by: userId, created_at: now, updated_at: now };
const respond = (route: Route, body: unknown) => route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-0/1" }, body: JSON.stringify(body) });

async function authorize(page: Page) {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: authStorageKey, value: session });
  await page.route("**/auth/v1/**", (route) => respond(route, route.request().url().includes("/user") ? session.user : session));
  await page.route("**/rest/v1/**", (route) => {
    const request = route.request(); const table = new URL(request.url()).pathname.split("/").at(-1);
    if (table === "workspace_members") return respond(route, [{ workspace_id: workspaceId, user_id: userId, role: "admin", is_default: true }]);
    if (table === "user_roles") return respond(route, [{ role: "admin_joia" }]);
    if (table === "workspaces") return respond(route, { id: workspaceId, name: "P9", slug: "p9" });
    if (table === "profiles") return respond(route, [{ id: userId, full_name: "Comercial E2E" }]);
    if (table === "employees") return respond(route, [{ id: userId, user_id: userId, name: "Comercial E2E", role: "Admin", status: "active", workspace_id: workspaceId, created_at: now, updated_at: now }]);
    if (table === "leads") return respond(route, request.method() === "POST" || request.method() === "PATCH" ? { ...lead, ...(request.postDataJSON() || {}) } : [lead]);
    if (table === "commercial_activities") return respond(route, [activity]);
    if (table === "commercial_proposals") return respond(route, [proposal]);
    if (table === "commercial_follow_ups") return respond(route, [followUp]);
    return respond(route, []);
  });
}

test("P9 apresenta pipeline, histórico e propostas no mobile", async ({ page }) => {
  await authorize(page); await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/comercial");
  await expect(page.getByRole("heading", { name: "Comercial", exact: true })).toBeVisible();
  await expect(page.getByText("Empresa Horizonte", { exact: true })).toBeVisible();
  await expect(page.getByText("R$ 48.000").first()).toBeVisible();
  await page.getByText("Empresa Horizonte", { exact: true }).click();
  await expect(page.getByText("Reunião de diagnóstico")).toBeVisible();
  await page.getByRole("tab", { name: "Propostas" }).click();
  await expect(page.getByText("Diagnóstico e plano de ação")).toBeVisible();
  await page.getByRole("tab", { name: "Follow-up" }).click();
  await expect(page.getByText("Revisar proposta").last()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("P9 abre cadastro completo de oportunidade", async ({ page }) => {
  await authorize(page); await page.setViewportSize({ width: 1280, height: 900 }); await page.goto("/comercial");
  await page.getByRole("button", { name: "Nova oportunidade" }).click();
  await expect(page.getByRole("heading", { name: "Nova oportunidade" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Empresa", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Contato", exact: true })).toBeVisible();
  await expect(page.getByLabel("Etapa comercial")).toBeVisible();
  await expect(page.getByLabel("Responsável comercial")).toBeVisible();
});
