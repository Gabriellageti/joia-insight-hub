import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env", "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => {
  const separator = line.indexOf("=");
  return [line.slice(0, separator), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")];
}));
const projectRef = new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0];
const authStorageKey = `sb-${projectRef}-auth-token`;
const userId = "10000000-0000-4000-8000-000000000001";
const workspaceId = "10000000-0000-4000-9000-000000000001";
const now = new Date().toISOString();
const session = { access_token: "p4-e2e-token", refresh_token: "p4-e2e-refresh", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user: { id: userId, aud: "authenticated", role: "authenticated", email: "p4-e2e@example.invalid", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: { full_name: "P4 E2E" }, identities: [], created_at: now, updated_at: now } };

const respond = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "content-range": "0-0/0" }, body: JSON.stringify(body) });

async function authorize(page: Page, documentStatus = 200) {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: authStorageKey, value: session });
  await page.route("**/auth/v1/**", (route) => respond(route, route.request().url().includes("/user") ? session.user : session));
  await page.route("**/rest/v1/**", (route) => {
    const table = new URL(route.request().url()).pathname.split("/").at(-1);
    if (table === "workspace_members") return respond(route, [{ workspace_id: workspaceId, user_id: userId, role: "admin", is_default: true }]);
    if (table === "workspaces") return respond(route, { id: workspaceId, name: "P4", slug: "p4" });
    if (table === "profiles") return respond(route, [{ id: userId, full_name: "P4 E2E", email: session.user.email }]);
    if (table === "documents") return respond(route, documentStatus === 200 ? [] : { message: "failure" }, documentStatus);
    return respond(route, []);
  });
}

test("P4 renderiza a central responsiva, filtros e upload", async ({ page }) => {
  await authorize(page);
  const documentRequests: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/rest/v1/documents")) documentRequests.push(request.url()); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/documentos");
  await expect(page.getByRole("heading", { name: "Documentos", exact: true })).toBeVisible();
  await expect(page.getByLabel("Buscar documentos")).toBeVisible();
  await expect(page.getByLabel("Filtrar por cliente")).toBeVisible();
  await expect(page.getByText("Nenhum documento encontrado")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(documentRequests.some((url) => url.includes("is_current_version=eq.true") && url.includes("archived_at=is.null"))).toBe(true);
  await page.getByRole("button", { name: "Enviar arquivo" }).click();
  await expect(page.getByRole("dialog")).toContainText("Upload de arquivo");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("P4 apresenta erro recuperável quando a consulta falha", async ({ page }) => {
  await authorize(page, 500);
  await page.goto("/documentos");
  await expect(page.getByRole("alert")).toContainText("Não foi possível carregar os documentos");
  await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
});
