import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")];
    }),
);

const projectRef = new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0];
const authStorageKey = `sb-${projectRef}-auth-token`;
const userId = "10000000-0000-4000-8000-000000000001";
const workspaceId = "10000000-0000-4000-9000-000000000001";
const now = new Date().toISOString();

const session = {
  access_token: "e2e-access-token",
  refresh_token: "e2e-refresh-token",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: {
    id: userId,
    aud: "authenticated",
    role: "authenticated",
    email: "auditoria-e2e@example.invalid",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: "Auditoria E2E" },
    identities: [],
    created_at: now,
    updated_at: now,
  },
};

const jsonResponse = (route: Route, body: unknown) => route.fulfill({
  status: 200,
  contentType: "application/json",
  headers: { "content-range": "0-0/0" },
  body: JSON.stringify(body),
});

async function installAuthorizedBackend(page: Page) {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: authStorageKey,
    value: session,
  });

  await page.route("**/auth/v1/**", (route) => {
    if (route.request().url().includes("/user")) return jsonResponse(route, session.user);
    return jsonResponse(route, session);
  });

  await page.route("**/rest/v1/**", (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.split("/").at(-1);
    if (table === "workspace_members") {
      return jsonResponse(route, [{ workspace_id: workspaceId, user_id: userId, role: "admin", is_default: true }]);
    }
    if (table === "workspaces") {
      return jsonResponse(route, { id: workspaceId, name: "Workspace E2E", slug: "workspace-e2e" });
    }
    if (table === "profiles") {
      return jsonResponse(route, [{ id: userId, full_name: "Auditoria E2E", email: session.user.email }]);
    }
    if (table === "get_operations_dashboard") {
      return jsonResponse(route, { scope: "company", periodDays: 30, kpis: { activeProjects: 0, riskProjects: 0, lateProjects: 0, openTasks: 0, lateTasks: 0, blockedTasks: 0, attentionClients: 0, pendingMeetings: 0, weekDeliveries: 0 }, projects: [], clients: [], attention: [], deliveries: [], weekly: { completedTasks: 0, createdTasks: 0, newBlocks: 0, completedMeetings: 0 } });
    }
    if (table === "get_team_operations") return jsonResponse(route, []);
    return jsonResponse(route, []);
  });
}

const routes = [
  "/", "/meu-dia", "/dashboard", "/minhas-tarefas", "/clientes", "/projetos", "/diagnostico", "/templates", "/plano-acao",
  "/indicadores", "/reunioes", "/documentos", "/playbooks", "/equipe", "/pendencias", "/atividades", "/relatorios/operacional",
  "/financeiro", "/marketing", "/configuracoes", "/rota-inexistente",
];
const widths = [320, 375, 768, 1024, 1440];

test("formulário de autenticação é acessível e não gera overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/auth");
  await expect(page.getByRole("heading", { name: "JoIA Ops" })).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveAttribute("required", "");
  await expect(page.getByLabel("Senha")).toHaveAttribute("autocomplete", "current-password");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("21 rotas principais renderizam sem tela branca, erro de console ou overflow", async ({ page }) => {
  await installAuthorizedBackend(page);
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  for (const path of routes) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(250);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(50);
      await expect(page.locator("body")).not.toHaveText("");
      await expect(page.locator("vite-error-overlay")).toHaveCount(0);
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(dimensions, `${path} em ${width}px`).toEqual({ scrollWidth: dimensions.clientWidth, clientWidth: dimensions.clientWidth });
    }
  }

  expect(consoleErrors).toEqual([]);
});
