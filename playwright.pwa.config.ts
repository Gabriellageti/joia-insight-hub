import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./pwa-e2e",
  timeout: 120_000,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:43178",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 43178 --strictPort",
    url: "http://127.0.0.1:43178/auth",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
