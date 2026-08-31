import { expect, test } from "@playwright/test";
import { installBackend, measure } from "./fixtures";

test("login e logout sintéticos preservam navegação nos oito tamanhos", async ({ page }) => {
  await installBackend(page);
  // Remove the fixture's initial session: the login below must create it through the mocked API.
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/auth");
  await page.getByLabel("Email", { exact: true }).fill("responsavel@example.invalid");
  await page.getByLabel("Senha", { exact: true }).fill("Synthetic-only-password-123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("region", { name: "Resumo do dia" })).toBeVisible();
  expect((await measure(page)).overflow).toBe(false);
  await page.getByRole("button", { name: "Abrir menu da conta" }).click();
  await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.endsWith("-auth-token")))).toEqual([]);
  expect((await measure(page)).overflow).toBe(false);
});
