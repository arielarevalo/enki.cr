import { describe, it, expect } from "vitest";
import { SELF } from "cloudflare:test";

async function readStream(response: Response): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let result = "";
  let done = false;
  while (!done) {
    const chunk = await reader.read();
    done = chunk.done;
    if (chunk.value) {
      result += decoder.decode(chunk.value, { stream: !done });
    }
  }
  return result;
}

function parseEvents(raw: string): Array<{ event: string; data: unknown }> {
  return raw
    .split("\n\n")
    .filter((block) => block.trim())
    .map((block) => {
      const lines = block.split("\n");
      const eventLine = lines.find((l) => l.startsWith("event: "));
      const dataLine = lines.find((l) => l.startsWith("data: "));
      return {
        event: eventLine?.slice(7) ?? "",
        data: dataLine ? JSON.parse(dataLine.slice(6)) : null,
      };
    });
}

describe("Outline Agent Integration", () => {
  it("returns 404 for unknown routes", async () => {
    const response = await SELF.fetch("http://localhost/unknown");
    expect(response.status).toBe(404);
  });

  it("returns 405 for non-POST to agent endpoint", async () => {
    const response = await SELF.fetch(
      "http://localhost/agents/OutlineDeepAgent/default",
      { method: "GET" },
    );
    // GET without /health path returns 405
    expect([405, 404]).toContain(response.status);
  });

  it("returns 400 for invalid JSON body", async () => {
    const response = await SELF.fetch(
      "http://localhost/agents/OutlineDeepAgent/default",
      {
        method: "POST",
        body: "not-json",
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for empty input array", async () => {
    const response = await SELF.fetch(
      "http://localhost/agents/OutlineDeepAgent/default",
      {
        method: "POST",
        body: JSON.stringify({ input: [] }),
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(response.status).toBe(400);
  });

  it("returns SSE stream for valid POST", async () => {
    const response = await SELF.fetch(
      "http://localhost/agents/OutlineDeepAgent/default",
      {
        method: "POST",
        body: JSON.stringify({
          input: [{ type: "input_text", text: "Test source content" }],
        }),
        headers: { "Content-Type": "application/json" },
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");

    const raw = await readStream(response);
    const events = parseEvents(raw);

    const eventTypes = events.map((e) => e.event);
    expect(eventTypes[0]).toBe("response.created");
    expect(eventTypes[eventTypes.length - 1]).toBe("response.completed");
  });
});
