import { expect, test, type Locator, type Page } from "@playwright/test";
import { installBackend, id, measure, longName } from "./fixtures";

async function fits(locator: Locator, page: Page) {
  await expect(locator).toBeVisible();
  await expect.poll(async () => {
    const box = await locator.boundingBox(); const viewport = page.viewportSize()!;
    return box && box.x >= -1 && box.y >= -1 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1 ? "fits" : JSON.stringify({ box, viewport, css: await locator.evaluate((el) => ({ top: getComputedStyle(el).top, maxHeight: getComputedStyle(el).maxHeight, visualHeight: getComputedStyle(document.documentElement).getPropertyValue('--visual-viewport-height'), visualWidth: visualViewport?.width, scrollHeight: document.documentElement.scrollHeight })) });
  }).toBe("fits");
}

test("shell: navegação, foco, busca, ações rápidas, formulários e notificações", async ({ page }, info) => {
  await installBackend(page);
  await page.goto("/meu-dia");
  await expect(page.getByRole("region", { name: "Resumo do dia" })).toBeVisible();
  if (page.viewportSize()!.width < 1024) {
    const trigger = page.getByRole("button", { name: "Abrir menu lateral" });
    await trigger.click();
    const drawer = page.getByRole("dialog");
    await fits(drawer, page);
    await page.keyboard.press("Escape"); await expect(drawer).toHaveCount(0); await expect(trigger).toBeFocused();
    await trigger.click(); await page.getByRole("dialog").getByRole("link", { name: "Clientes", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/\/clientes$/);
  }
  await page.getByRole("searchbox", { name: "Busca global" }).fill("Empresa");
  await page.getByRole("list", { name: "Resultados da busca" }).getByRole("button").first().click();
  await expect(page).toHaveURL(new RegExp(`/clientes/${id}$`));

  for (const action of ["Nova tarefa", "Criar cliente", "Criar projeto", "Agendar reunião"]) {
    await page.getByRole("button", { name: "Abrir ações rápidas" }).click();
    await page.getByRole("menuitem", { name: action, exact: true }).click();
    const dialog = page.getByRole("dialog"); await fits(dialog, page);
    const fields = dialog.locator("input:not([type=hidden]), textarea");
    if (await fields.count()) { await fields.first().focus(); await page.keyboard.press("Tab"); expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true); }
    for (const tab of await dialog.getByRole("tab").all()) { await tab.click(); await fits(dialog, page); }
    const lastButton = dialog.getByRole("button").filter({ hasNotText: /^Close$/ }).last();
    await lastButton.scrollIntoViewIfNeeded(); await expect(lastButton).toBeInViewport();
    await page.screenshot({ path: `tmp/responsive/dialog-${info.project.name}-${action.replaceAll(" ", "-")}.png` });
    await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0);
  }
  await page.getByRole("button", { name: /notificações não lidas/ }).click();
  await fits(page.locator('[data-radix-popper-content-wrapper]').last(), page);
  await page.keyboard.press("Escape");
  const result = await measure(page); expect(result.overflow).toBe(false); expect(result.outside).toEqual([]);
});

test("plano: filtros, seleção longa, status alternativo e 100 tarefas", async ({ page }) => {
  await installBackend(page, 100);
  await page.goto("/plano-acao");
  const filterButton = page.getByRole("button", { name: /^Filtros/ });
  if (page.viewportSize()!.width < 768) await filterButton.click();
  await page.getByRole("combobox", { name: "Filtrar por cliente" }).click();
  await fits(page.getByRole("listbox"), page);
  await page.getByRole("option", { name: longName, exact: true }).click();
  if (await page.getByRole("dialog").count()) await page.keyboard.press("Escape");
  const board = page.getByLabel("Kanban de tarefas", { exact: true });
  await expect(board).toBeVisible();
  if (page.viewportSize()!.width < 1440) expect(await board.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  const status = board.getByRole("combobox", { name: /Alterar status da tarefa/ }).first();
  const statusName = await status.getAttribute("aria-label");
  await status.selectOption("in_progress");
  await expect(board.getByRole("combobox", { name: statusName!, exact: true })).toHaveValue("in_progress");
  expect((await measure(page)).overflow).toBe(false);
});

test("estado vazio e viewport curta preservam acesso ao formulário", async ({ page }) => {
  await installBackend(page, 0);
  await page.goto("/clientes");
  await expect(page.getByRole("heading", { name: "Clientes", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Novo Cliente", exact: true }).click();
  const original = page.viewportSize()!;
  // Reduced viewport is a regression proxy, NOT proof of a native OS keyboard.
  await page.setViewportSize({ width: original.width, height: 360 });
  await fits(page.getByRole("dialog"), page);
  const input = page.getByRole("dialog").locator("input").first();
  await input.focus(); await input.scrollIntoViewIfNeeded(); await expect(input).toBeInViewport();
  await page.keyboard.press("Escape");
  await page.setViewportSize(original);
});
