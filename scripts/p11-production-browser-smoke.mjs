import { randomUUID } from "node:crypto";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.P11_BASE_URL || "https://joia-ops-live.vercel.app";
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !secretKey) throw new Error("Variáveis server-side Supabase ausentes");

const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false } });
const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
const email = `p11-browser-${suffix}@example.invalid`;
const password = `P11-${randomUUID()}-aA1!`;
let userId;
let workspaceId;
let browser;

const routes = [
  "/meu-dia", "/clientes", "/projetos", "/templates", "/plano-acao", "/minhas-tarefas",
  "/reunioes", "/documentos", "/relatorios/consultoria", "/assistente", "/comercial", "/automacoes",
];

try {
  const created = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: `P11 Browser ${suffix}` },
  });
  if (created.error || !created.data.user) throw created.error || new Error("usuário não criado");
  userId = created.data.user.id;
  const workspace = await admin.from("workspaces").insert({
    name: `P11 Browser ${suffix}`, slug: `p11-browser-${suffix}`, created_by: userId,
  }).select("id").single();
  if (workspace.error || !workspace.data) throw workspace.error || new Error("workspace não criado");
  workspaceId = workspace.data.id;
  const member = await admin.from("workspace_members").insert({
    workspace_id: workspaceId, user_id: userId, role: "owner", is_default: true, created_by: userId,
  });
  if (member.error) throw member.error;

  browser = await chromium.launch({ channel: process.env.CI ? undefined : "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  await page.goto(`${baseUrl}/auth`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) => url.pathname !== "/auth", { timeout: 30_000 });

  const routeResults = [];
  for (const route of routes) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.innerText.trim().length > 20, null, { timeout: 10_000 });
    await page.waitForTimeout(250);
    routeResults.push({
      route,
      loaded: new URL(page.url()).pathname === route
        && (await page.locator("body").innerText()).trim().length > 20
        && await page.locator("vite-error-overlay").count() === 0,
    });
  }

  const secondTab = await context.newPage();
  await secondTab.goto(`${baseUrl}/meu-dia`, { waitUntil: "domcontentloaded" });
  const multiTab = new URL(secondTab.url()).pathname === "/meu-dia";
  await secondTab.close();

  const manifest = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    if (!link) return false;
    const response = await fetch(link.href);
    return response.ok && (await response.json()).display === "standalone";
  });
  const serviceWorker = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return false;
    return Boolean(await navigator.serviceWorker.ready);
  });

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  const offline = (await page.locator("body").innerText()).trim().length > 20;
  await context.setOffline(false);

  await page.getByRole("button", { name: "Abrir menu da conta" }).click();
  await page.getByText("Sair", { exact: true }).click();
  await page.waitForURL("**/auth", { timeout: 30_000 });
  const logout = new URL(page.url()).pathname === "/auth";
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) => url.pathname !== "/auth", { timeout: 30_000 });
  await page.reload({ waitUntil: "domcontentloaded" });
  const persistence = new URL(page.url()).pathname !== "/auth";

  const passedRoutes = routeResults.filter((item) => item.loaded).length;
  console.log(JSON.stringify({
    result: passedRoutes === routes.length && multiTab && manifest && serviceWorker && offline && logout && persistence && runtimeErrors.length === 0 ? "PASS" : "FAIL",
    routes: { total: routes.length, passed: passedRoutes, failed: routeResults.filter((item) => !item.loaded).map((item) => item.route) },
    multiTab, manifest, serviceWorker, offline, logout, loginAgain: persistence,
    runtimeErrorCount: runtimeErrors.length,
  }));
} finally {
  if (browser) await browser.close();
  const cleanupErrors = [];
  if (workspaceId) {
    const removed = await admin.from("workspaces").delete().eq("id", workspaceId);
    if (removed.error) cleanupErrors.push(`workspace:${removed.error.code || "unknown"}`);
  }
  if (userId) {
    const removed = await admin.auth.admin.deleteUser(userId);
    if (removed.error) cleanupErrors.push(`user:${removed.error.code || "unknown"}`);
  }
  if (cleanupErrors.length) throw new Error(`P11_FIXTURE_CLEANUP_FAILED:${cleanupErrors.join(",")}`);
}
