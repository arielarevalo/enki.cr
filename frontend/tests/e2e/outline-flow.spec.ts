import { test, expect } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:4173";

test.skip(
  !baseURL.includes("localhost"),
  "Skipped: outline-flow tests only run against localhost"
);

function sseEvent(event: string, data: object): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

test("happy path: API key → source → process → result", async ({ page }) => {
  const respId = "resp_test";
  const msgId = "msg_test";
  const fullText = "# Analysis\nResults here.";

  // Mock the API endpoint with real Responses API SSE format
  await page.route("**/api/outline/process", async (route) => {
    const body = [
      sseEvent("response.created", {
        type: "response.created",
        response: { id: respId, object: "response", created_at: Date.now(), status: "in_progress", output: [] },
      }),
      sseEvent("response.output_item.added", {
        type: "response.output_item.added",
        output_index: 0,
        item: { type: "message", id: msgId, status: "in_progress", role: "assistant", content: [] },
      }),
      sseEvent("response.content_part.added", {
        type: "response.content_part.added",
        item_id: msgId, output_index: 0, content_index: 0,
        part: { type: "output_text", text: "", annotations: [] },
      }),
      sseEvent("response.output_text.delta", {
        type: "response.output_text.delta",
        item_id: msgId, output_index: 0, content_index: 0,
        delta: "# Analysis\n",
      }),
      sseEvent("response.output_text.delta", {
        type: "response.output_text.delta",
        item_id: msgId, output_index: 0, content_index: 0,
        delta: "Results here.",
      }),
      sseEvent("response.output_text.done", {
        type: "response.output_text.done",
        item_id: msgId, output_index: 0, content_index: 0,
        text: fullText,
      }),
      sseEvent("response.content_part.done", {
        type: "response.content_part.done",
        item_id: msgId, output_index: 0, content_index: 0,
        part: { type: "output_text", text: fullText, annotations: [] },
      }),
      sseEvent("response.output_item.done", {
        type: "response.output_item.done",
        output_index: 0,
        item: { type: "message", id: msgId, status: "completed", role: "assistant", content: [{ type: "output_text", text: fullText, annotations: [] }] },
      }),
      sseEvent("response.completed", {
        type: "response.completed",
        response: {
          id: respId, object: "response", created_at: Date.now(), status: "completed",
          output: [{ type: "message", id: msgId, status: "completed", role: "assistant", content: [{ type: "output_text", text: fullText, annotations: [] }] }],
        },
      }),
    ].join("");

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

  // Should show streamed content
  await expect(page.getByText("Results here.")).toBeVisible({ timeout: 10000 });
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
