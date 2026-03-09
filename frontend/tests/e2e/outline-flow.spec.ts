import { test, expect } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:4173";

test.skip(
  !baseURL.includes("localhost"),
  "Skipped: outline-flow tests only run against localhost"
);

function ssePayload(content: string): string {
  const obj = { choices: [{ delta: { content } }] };
  return `data: ${JSON.stringify(obj)}\n\n`;
}

test("happy path: API key → source → process → result", async ({ page }) => {
  // Mock the API endpoint
  await page.route("**/api/outline/process", async (route) => {
    const body = ssePayload("# Analysis\n") + ssePayload("Results here.") + "data: [DONE]\n\n";
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body,
    });
  });

  await page.goto("/");

  // Enter API key
  await page.getByPlaceholder("Enter your API key").fill("test-key");
  await page.getByRole("button", { name: "Go" }).click();

  // Enter source
  await page.getByPlaceholder("source-1.example.com").fill("example.com");
  await page.getByRole("button", { name: "Process" }).click();

  // Should transition to streaming/result state
  await expect(page.getByRole("dialog")).toHaveAttribute("aria-label", "Streaming analysis events");
});

test("empty API key shows error", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Go" }).click();
  await expect(page.getByText("API key is required")).toBeVisible();
});

test("process button disabled with no valid sources", async ({ page }) => {
  await page.goto("/");

  // Enter API key first
  await page.getByPlaceholder("Enter your API key").fill("test-key");
  await page.getByRole("button", { name: "Go" }).click();

  // Process button should be disabled with empty sources
  await expect(page.getByRole("button", { name: "Process" })).toBeDisabled();
});

test("add source button adds an input", async ({ page }) => {
  await page.goto("/");

  await page.getByPlaceholder("Enter your API key").fill("test-key");
  await page.getByRole("button", { name: "Go" }).click();

  // Should start with 3 inputs
  await expect(page.getByRole("textbox")).toHaveCount(3);

  await page.getByRole("button", { name: "Add source" }).click();
  await expect(page.getByRole("textbox")).toHaveCount(4);
});

test("API error (401) shows error text", async ({ page }) => {
  await page.route("**/api/outline/process", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "Invalid API key" } }),
    });
  });

  await page.goto("/");

  await page.getByPlaceholder("Enter your API key").fill("bad-key");
  await page.getByRole("button", { name: "Go" }).click();

  await page.getByPlaceholder("source-1.example.com").fill("example.com");
  await page.getByRole("button", { name: "Process" }).click();

  await expect(page.getByText("Invalid API key")).toBeVisible({ timeout: 10000 });
});

test("network error shows failure message", async ({ page }) => {
  await page.route("**/api/outline/process", async (route) => {
    await route.abort("connectionrefused");
  });

  await page.goto("/");

  await page.getByPlaceholder("Enter your API key").fill("test-key");
  await page.getByRole("button", { name: "Go" }).click();

  await page.getByPlaceholder("source-1.example.com").fill("example.com");
  await page.getByRole("button", { name: "Process" }).click();

  await expect(page.getByText("Failed to connect")).toBeVisible({ timeout: 10000 });
});
