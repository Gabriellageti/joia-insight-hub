import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Same functional assertions against the compiled frontend, with synthetic backends.
export default defineConfig({
  ...base,
  workers: 1,
  use: { ...base.use, channel: undefined },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 43181 --strictPort",
    url: "http://127.0.0.1:43181/auth",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{ name: "release", use: { baseURL: "http://127.0.0.1:43181" } }],
});
