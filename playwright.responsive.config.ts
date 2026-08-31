import { defineConfig } from "@playwright/test";
import { viewports } from "./responsive-e2e/fixtures";

const preview = process.env.RESPONSIVE_PREVIEW === "true";
const port = preview ? 43182 : 43179;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./responsive-e2e", timeout: 90_000, retries: 0, workers: 1,
  reporter: "list", outputDir: `tmp/responsive/test-results-${process.env.RESPONSIVE_PHASE || 'interactions'}`,
  use: { actionTimeout: 15_000, baseURL, channel: process.env.RESPONSIVE_BROWSER === "chrome" ? "chrome" : undefined, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: viewports.map(({ name, width, height }) => ({ name, use: { viewport: { width, height }, isMobile: width < 768, hasTouch: width < 1024 } })),
  webServer: { command: `npm run ${preview ? "preview" : "dev"} -- --host 127.0.0.1 --port ${port} --strictPort`, url: `${baseURL}/auth`, reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
