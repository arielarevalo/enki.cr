import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:4173";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "html",
  use: { baseURL, trace: "on-first-retry" },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: "real-e2e.spec.ts",
    },
    {
      name: "e2e",
      use: { ...devices["Desktop Chrome"] },
      testMatch: "real-e2e.spec.ts",
    },
  ],
  webServer: !process.env.E2E_BASE_URL
    ? { command: "npm run build && npm run preview", port: 4173, reuseExistingServer: !process.env.CI }
    : undefined,
});
