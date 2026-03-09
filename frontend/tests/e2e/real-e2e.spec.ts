import { test, expect } from "@playwright/test";
import { checkBackendHealth } from "./preflight";

test.beforeAll(async () => {
  await checkBackendHealth();
});

test("full flow: API key → source → process → streaming result", async ({ page }) => {
  await page.goto("/");

  // Enter API key
  await page.getByPlaceholder("Enter your API key").fill("enki_local_admin_key");
  await page.getByRole("button", { name: "Go" }).click();

  // Enter source
  await page.getByPlaceholder("source-1.example.com").fill("example.com");
  await page.getByRole("button", { name: "Process" }).click();

  // Should transition to streaming state and render content
  await expect(page.getByRole("dialog")).toHaveAttribute(
    "aria-label",
    "Streaming analysis events",
  );

  // Verify streamed content actually renders (not just dialog transition)
  await expect(page.getByRole("dialog").locator("p").first()).toBeVisible({ timeout: 15000 });
});
