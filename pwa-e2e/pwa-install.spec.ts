import { expect, test } from "@playwright/test";

test("manifesto, instalação nativa e navegação offline funcionam no build de produção", async ({ page, context }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/auth");
  await expect(page.getByRole("heading", { name: "JoIA Ops" })).toBeVisible();

  const manifest = await page.evaluate(async () => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) throw new Error("Manifesto não associado ao documento");
    return fetch(link.href).then((response) => response.json());
  });
  expect(manifest).toMatchObject({ name: "JoIA Ops", display: "standalone", theme_color: "#171717" });

  await page.evaluate(() => {
    const installEvent = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperties(installEvent, {
      prompt: { value: async () => { (window as Window & { __installPromptCalled?: boolean }).__installPromptCalled = true; } },
      userChoice: { value: Promise.resolve({ outcome: "accepted" }) },
    });
    window.dispatchEvent(installEvent);
  });
  await page.getByRole("button", { name: "Instalar", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __installPromptCalled?: boolean }).__installPromptCalled)).toBe(true);

  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  expect(consoleErrors).toEqual([]);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "JoIA Ops" })).toBeVisible();
  await expect(page.getByText("Sem conexão.", { exact: false })).toBeVisible();
  await context.setOffline(false);
});

test.describe("instalação no iPhone", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
    hasTouch: true,
    isMobile: true,
  });

  test("exibe instruções do Safari sem gerar overflow", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("button", { name: "Instalar", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Adicionar à Tela de Início");
    await expect(page.getByRole("dialog")).toContainText("Abrir como App");
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});

test("não persiste APIs autenticadas no Cache Storage", async ({ page, context }) => {
  await page.route("**/api/private-probe", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ confidential: true }),
  }));
  await page.goto("/auth");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.evaluate(() => fetch("/api/private-probe", { headers: { Authorization: "Bearer fake" } }).then((response) => response.json()));

  const sensitiveCachedUrls = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const cacheName of await caches.keys()) {
      for (const request of await (await caches.open(cacheName)).keys()) {
        if (/\/api\/|\/rest\/v1\/|\/auth\/v1\//.test(request.url)) urls.push(request.url);
      }
    }
    return urls;
  });
  expect(sensitiveCachedUrls).toEqual([]);

  await page.unroute("**/api/private-probe");
  await context.setOffline(true);
  const offlineResult = await page.evaluate(() => fetch("/api/private-probe").then(() => "cached").catch(() => "network-error"));
  expect(offlineResult).toBe("network-error");
  await context.setOffline(false);
});
