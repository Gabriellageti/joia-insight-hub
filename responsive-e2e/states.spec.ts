import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { installBackend, measure, routes, viewports } from "./fixtures";

test("estados expandidos: rotas e abas com dados longos nos oito tamanhos", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Esta coleta percorre os oito viewports internamente.");
  test.setTimeout(900_000);
  await installBackend(page, 1, true);
  const directory = "tmp/responsive/expanded";
  mkdirSync(directory, { recursive: true });
  const results: unknown[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const { pattern, path } of routes.filter((route) => !["/auth", "/", "*"].includes(route.pattern))) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(path);
    await page.locator("main").waitFor();
    await page.waitForTimeout(250);
    const seen = new Set<string>();
    let state = "inicial";
    for (let step = 0; step < 35; step++) {
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(90);
        const result = { pattern, state, viewport: viewport.name, ...await measure(page), errors: [...errors] };
        results.push(result);
        expect.soft(result.overflow, `${pattern} / ${state} / ${viewport.name}`).toBe(false);
        expect.soft(result.outside, `${pattern} / ${state} / ${viewport.name}`).toEqual([]);
        expect.soft(result.errors, `${pattern} / ${state}`).toEqual([]);
        if (["mobile", "tablet", "desktop"].includes(viewport.name) && (state === "inicial" || result.overflow || result.outside.length)) {
          await page.screenshot({ path: `${directory}/${pattern.replace(/[^a-z0-9]/gi, "_")}-${state.replace(/[^a-z0-9]/gi, "_")}-${viewport.name}.png`, fullPage: true, animations: "disabled", timeout: 30_000 });
        }
      }
      writeFileSync(`${directory}/states.json`, JSON.stringify(results, null, 2));
      const tabs = await page.locator('main [role="tab"]:visible').evaluateAll((elements) => elements.map((el) => ({ id: el.id, name: el.textContent || "" })));
      const next = tabs.find((tab) => !seen.has(tab.id));
      if (!next) break;
      seen.add(next.id); state = next.name;
      await page.locator(`[id="${next.id}"]`).click();
      await page.waitForTimeout(120);
    }
  }
});

test("diálogos complementares: CRM, documentos, modelos e edição", async ({ page }, info) => {
  test.setTimeout(180_000);
  await installBackend(page, 1, true);
  const results: unknown[] = [];
  const cases = [
    { path: "/comercial", button: "Nova oportunidade" },
    { path: "/modelos-projeto", button: "Novo modelo" },
    { path: "/modelos-projeto", button: "Modelo de tarefa" },
    { path: "/documentos", button: "Enviar arquivo" },
    { path: "/clientes", button: "Editar cliente" },
  ];
  for (const entry of cases) {
    await page.goto(entry.path);
    await page.getByRole("button", { name: entry.button, exact: true }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(250);
    const tabs = await dialog.getByRole("tab").all();
    for (const tab of tabs) { await tab.click(); await expect(tab).toHaveAttribute("aria-selected", "true"); }
    const result = await measure(page);
    results.push({ ...entry, ...result });
    expect.soft(result.overflow, entry.button).toBe(false);
    expect.soft(result.outside, entry.button).toEqual([]);
    const box = await dialog.boundingBox();
    expect.soft(box!.y, entry.button).toBeGreaterThanOrEqual(-1);
    expect.soft(box!.y + box!.height, entry.button).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
    await page.screenshot({ path: `tmp/responsive/extra-dialog-${info.project.name}-${entry.button.replaceAll(" ", "-")}.png`, animations: "disabled" });
    await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0);
  }
  await page.goto("/comercial");
  await page.getByLabel("Kanban comercial", { exact: true }).getByText("Empresa de Consultoria e Desenvolvimento Empresarial do Sudeste Ltda", { exact: true }).click();
  for (const name of ["Histórico", "Propostas", "Follow-up", "Conversão"]) {
    const dialog = page.getByRole("dialog"); await dialog.getByRole("tab", { name, exact: true }).click();
    const result = await measure(page); results.push({ path: "/comercial", state: name, ...result });
    expect.soft(result.overflow, name).toBe(false); expect.soft(result.outside, name).toEqual([]);
  }
  writeFileSync(`tmp/responsive/extra-dialogs-${info.project.name}.json`, JSON.stringify(results, null, 2));
});

test("carregamento, erro recuperável e retorno ao estado disponível", async ({ page }) => {
  await installBackend(page);
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => { release = resolve; });
  const pattern = "**/rest/v1/clients?**";
  await page.route(pattern, async (route) => {
    await pending;
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Falha sintética de disponibilidade" }) });
  });
  await page.goto("/clientes");
  await expect(page.getByText("Carregando clientes...", { exact: true })).toBeVisible();
  expect((await measure(page)).overflow).toBe(false);
  release();
  // The client retries transient 503 responses before exposing the recoverable error.
  await expect(page.getByText(/Não foi possível carregar os clientes:/)).toBeVisible({ timeout: 20_000 });
  expect((await measure(page)).overflow).toBe(false);
  await page.unroute(pattern);
  await page.reload();
  await expect(page.getByRole("button", { name: "Editar cliente", exact: true })).toBeVisible();
});
