import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env", "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => { const separator = line.indexOf("="); return [line.slice(0, separator), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")]; }));
const projectRef = new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0]; const authStorageKey = `sb-${projectRef}-auth-token`;
const userId = "10000000-0000-4000-8000-000000000001"; const workspaceId = "10000000-0000-4000-9000-000000000001"; const clientId = "20000000-0000-4000-8000-000000000001"; const reportId = "70000000-0000-4000-8000-000000000001"; const now = new Date().toISOString();
const session = { access_token: "p7-e2e-token", refresh_token: "p7-e2e-refresh", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user: { id: userId, aud: "authenticated", role: "authenticated", email: "p7-e2e@example.invalid", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: { full_name: "P7 E2E" }, identities: [], created_at: now, updated_at: now } };
const report = { id: reportId, workspace_id: workspaceId, client_id: clientId, project_ids: [], period_start: "2026-08-01", period_end: "2026-08-31", title: "Relatório de Consultoria - Grupo H2O", version_group_id: reportId, version_number: 1, status: "draft", sections: { executive_summary: "Resumo executivo revisável.", activities: "• Diagnóstico concluído", meetings: "• Reunião de acompanhamento", diagnostics: "• Diagnóstico operacional", decisions: "• Priorizar conciliação", improvements: "• Processo financeiro revisado", completed_tasks: "• Auditoria concluída", pending_tasks: "• Validar indicadores", risks: "• Prazo de implantação", next_steps: "• Reunião executiva", documents: "• Relatório mensal", considerations: "Revisar antes de finalizar." }, source_snapshot: {}, created_by: userId, updated_by: userId, finalized_by: null, finalized_at: null, created_at: now, updated_at: now };
const respond = (route: Route, body: unknown) => route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-0/1" }, body: JSON.stringify(body) });
async function authorize(page: Page) {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: authStorageKey, value: session });
  await page.route("**/auth/v1/**", (route) => respond(route, route.request().url().includes("/user") ? session.user : session));
  await page.route("**/rest/v1/**", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.split("/").at(-1);
    if (table === "workspace_members") return respond(route, [{ workspace_id: workspaceId, user_id: userId, role: "admin", is_default: true }]);
    if (table === "workspaces") return respond(route, { id: workspaceId, name: "P7", slug: "p7" });
    if (table === "profiles") return respond(route, [{ id: userId, full_name: "P7 E2E" }]);
    if (table === "clients") return respond(route, [{ id: clientId, name: "Grupo H2O", trade_name: "Grupo H2O", workspace_id: workspaceId, created_at: now, updated_at: now }]);
    if (table === "consulting_reports") {
      if (request.method() === "PATCH") return respond(route, { ...report, ...request.postDataJSON() });
      if (url.searchParams.has("id")) return respond(route, report);
      return respond(route, [report]);
    }
    return respond(route, []);
  });
}

test("P7 permite revisar e exportar PDF do relatório", async ({ page }) => {
  await authorize(page); await page.setViewportSize({ width: 390, height: 844 }); await page.goto(`/relatorios/consultoria/${reportId}`);
  await expect(page.getByRole("heading", { name: "Relatório de Consultoria" })).toBeVisible();
  await expect(page.getByLabel("Resumo Executivo")).toHaveValue("Resumo executivo revisável.");
  await expect(page.getByRole("button", { name: "Compartilhar" })).toBeVisible();
  await page.getByLabel("Considerações").fill("Conteúdo revisado pelo consultor.");
  await page.getByRole("button", { name: "Salvar" }).click();
  const downloadPromise = page.waitForEvent("download"); await page.getByRole("button", { name: "Exportar PDF" }).click(); const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^relatorio-consultoria-.*\.pdf$/);
  await download.saveAs("output/pdf/p7-relatorio-consultoria-e2e.pdf");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
