import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { installBackend, measure, routes, viewports } from "./fixtures";

test("inventário completo: geometria por rota e viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "A matriz redimensiona a mesma página nos oito viewports; interações usam todos os projetos.");
  test.setTimeout(480_000);
  await installBackend(page);
  const phase = process.env.RESPONSIVE_PHASE || "current";
  const results: Record<string, Awaited<ReturnType<typeof measure>>[]> = {};
  for (const viewport of viewports) { mkdirSync(`tmp/responsive/${phase}/${viewport.name}`, { recursive: true }); results[viewport.name] = []; }
  for (const { path, pattern } of routes) {
    const errors: string[] = [];
    const onError = (error: Error) => errors.push(error.message);
    page.on("pageerror", onError);
    if (path === "/auth") await page.addInitScript(() => localStorage.clear());
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.locator("h1,main").first().waitFor();
    await page.waitForTimeout(200);
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(80);
      const dimensions = await measure(page);
      const name = pattern.replace(/[^a-z0-9]/gi, "_") || "index";
      const directory = `tmp/responsive/${phase}/${viewport.name}`;
      if (["mobile", "tablet", "desktop"].includes(viewport.name)) await page.screenshot({ path: `${directory}/${name}.png`, fullPage: true, animations: "disabled" });
      const result = { pattern, path, actualPath: new URL(page.url()).pathname, ...dimensions, errors: [...errors] };
      results[viewport.name].push(result);
      writeFileSync(`${directory}/routes.json`, JSON.stringify(results[viewport.name], null, 2));
      if (!phase.startsWith("baseline")) {
        expect.soft(result.overflow, `${pattern} ${viewport.width}`).toBe(false);
        expect.soft(result.outside, `${pattern} ${viewport.width}`).toEqual([]);
        expect.soft(result.errors, `${pattern} ${viewport.width}`).toEqual([]);
      }
    }
    if (path === "/auth") { await page.close(); break; }
    page.off("pageerror", onError);
  }
});
