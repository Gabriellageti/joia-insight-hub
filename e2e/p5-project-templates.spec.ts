import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env", "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => { const separator = line.indexOf("="); return [line.slice(0, separator), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")]; }));
const projectRef = new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0];
const authStorageKey = `sb-${projectRef}-auth-token`;
const userId = "10000000-0000-4000-8000-000000000001";
const workspaceId = "10000000-0000-4000-9000-000000000001";
const clientId = "20000000-0000-4000-8000-000000000001";
const projectId = "30000000-0000-4000-8000-000000000001";
const now = new Date().toISOString();
const session = { access_token: "p5-e2e-token", refresh_token: "p5-e2e-refresh", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user: { id: userId, aud: "authenticated", role: "authenticated", email: "p5-e2e@example.invalid", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: { full_name: "P5 E2E" }, identities: [], created_at: now, updated_at: now } };
const respond = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "content-range": "0-0/1" }, body: JSON.stringify(body) });

async function authorize(page: Page) {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: authStorageKey, value: session });
  await page.route("**/auth/v1/**", (route) => respond(route, route.request().url().includes("/user") ? session.user : session));
  await page.route("**/rest/v1/**", (route) => {
    const table = new URL(route.request().url()).pathname.split("/").at(-1);
    if (table === "workspace_members") return respond(route, [{ workspace_id: workspaceId, user_id: userId, role: "owner", is_default: true }]);
    if (table === "workspaces") return respond(route, { id: workspaceId, name: "P5", slug: "p5" });
    if (table === "profiles") return respond(route, [{ id: userId, full_name: "P5 E2E" }]);
    if (table === "project_templates") return respond(route, [{ id: "template-1", name: "Consultoria Empresarial", description: "Estrutura padrão", project_type: "consulting", default_phase: "Diagnóstico", is_internal_process: false, status: "published", project_template_stages: [{ count: 7 }], task_templates: [{ count: 7 }] }]);
    if (table === "task_templates") return respond(route, [{ id: "task-template-1", title: "Auditoria Financeira", description: "Modelo menor", default_priority: "high", start_offset_days: 0, due_offset_days: 7, initial_status: "not_started", default_assignee_id: null, task_template_checklist_items: [{ id: "check-1", text: "Solicitar documentos", position: 0 }] }]);
    if (table === "clients") return respond(route, [{ id: clientId, name: "Cliente P5", company_name: "Cliente P5", workspace_id: workspaceId, created_at: now, updated_at: now }]);
    if (table === "projects") return respond(route, [{ id: projectId, name: "Projeto origem", client_id: clientId, objective: "", scope: "", phase: "Diagnóstico", status: "Em andamento", responsible: "P5 E2E", progress: 0, start_date: "2026-08-01", end_date: "2026-10-01", money_hypothesis: 0, project_type: "consulting", workspace_id: workspaceId, created_at: now, updated_at: now }]);
    if (table === "employees") return respond(route, [{ id: userId, user_id: userId, name: "P5 E2E", role: "Admin", status: "active", workspace_id: workspaceId }]);
    return respond(route, []);
  });
}

test("P5 exibe modelos e editor responsivo com regras relativas", async ({ page }) => {
  await authorize(page); await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/modelos-projeto");
  await expect(page.getByRole("heading", { name: "Modelos de projeto" })).toBeVisible();
  await expect(page.getByText("Consultoria Empresarial", { exact: true })).toBeVisible();
  await expect(page.getByText("7 etapas · 7 tarefas")).toBeVisible();
  await expect(page.getByText("Auditoria Financeira", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Novo modelo" }).click();
  await expect(page.getByRole("dialog")).toContainText("Dia 0");
  await expect(page.getByPlaceholder("Checklist separado por ponto e vírgula")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("P5 oferece duplicação seletiva sem cópia física", async ({ page }) => {
  await authorize(page); await page.goto("/projetos");
  await expect(page.getByText("Projeto origem", { exact: true })).toBeVisible();
  await page.locator("button:has(svg.lucide-ellipsis)").click();
  await page.getByRole("menuitem", { name: "Duplicar" }).click();
  await expect(page.getByRole("dialog")).toContainText("nenhum arquivo físico será copiado");
  await expect(page.getByText("Tarefas e checklists")).toBeVisible();
  await expect(page.getByText("Documentos estruturais")).toBeVisible();
});
