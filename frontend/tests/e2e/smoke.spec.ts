import { test, expect } from "@playwright/test";

test("page loads with correct title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Enki/);
});

test("API key form is visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("brand text is visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Enki", { exact: true }).first()).toBeVisible();
});

test("hero heading is present", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Building what comes next.")).toBeVisible();
});
