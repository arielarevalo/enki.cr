import { describe, it, expect, vi, beforeEach } from "vitest";

// Reset module state between tests
let normalizeUrl: typeof import("../../src/api/adapter").normalizeUrl;
let setApiKey: typeof import("../../src/api/adapter").setApiKey;
let setSources: typeof import("../../src/api/adapter").setSources;
let enkiAdapter: typeof import("../../src/api/adapter").enkiAdapter;

beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal("fetch", vi.fn());
  const mod = await import("../../src/api/adapter");
  normalizeUrl = mod.normalizeUrl;
  setApiKey = mod.setApiKey;
  setSources = mod.setSources;
  enkiAdapter = mod.enkiAdapter;
});

function sseChunk(data: string): Uint8Array {
  return new TextEncoder().encode(`data: ${data}\n\n`);
}

function deltaEvent(text: string): Uint8Array {
  return new TextEncoder().encode(
    `event: response.output_text.delta\ndata: ${JSON.stringify({ type: "response.output_text.delta", delta: text })}\n\n`,
  );
}

function completedEvent(fullText: string): Uint8Array {
  return new TextEncoder().encode(
    `event: response.completed\ndata: ${JSON.stringify({
      type: "response.completed",
      response: {
        id: "resp_test",
        status: "completed",
        output: [{ type: "message", content: [{ type: "output_text", text: fullText }] }],
      },
    })}\n\n`,
  );
}

function mockStream(...chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(chunks[i++]);
      } else {
        controller.close();
      }
    },
  });
}

function mockFetchResponse(body: ReadableStream<Uint8Array>, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    body,
    headers: new Headers(),
    json: () => Promise.reject(new Error("not implemented")),
  } as unknown as Response;
}

async function collectResults(adapter: typeof enkiAdapter): Promise<string[]> {
  const results: string[] = [];
  const gen = adapter.run({ messages: [], abortSignal: new AbortController().signal });
  for await (const msg of gen) {
    const text = msg.content?.[0];
    if (text && "text" in text) results.push(text.text);
  }
  return results;
}

describe("normalizeUrl", () => {
  it("adds https:// when protocol is missing", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
  });

  it("preserves existing http://", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
  });

  it("preserves existing https://", () => {
    expect(normalizeUrl("https://example.com")).toBe("https://example.com");
  });

  it("is case-insensitive for protocol check", () => {
    expect(normalizeUrl("HTTP://example.com")).toBe("HTTP://example.com");
  });
});

describe("enkiAdapter.run()", () => {
  it("POSTs to correct endpoint with auth header and sources body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockFetchResponse(mockStream())
    );
    vi.stubGlobal("fetch", fetchMock);

    setApiKey("test-key");
    setSources(["example.com", "https://other.com"]);

    await collectResults(enkiAdapter);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/outline/process");
    expect(opts.method).toBe("POST");
    expect(opts.headers.Authorization).toBe("Bearer test-key");
    expect(JSON.parse(opts.body)).toEqual({
      sources: ["https://example.com", "https://other.com"],
    });
  });

  it("yields accumulated text from multiple SSE delta events", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      mockFetchResponse(mockStream(deltaEvent("Hello "), deltaEvent("World")))
    ));

    const results = await collectResults(enkiAdapter);
    expect(results).toContain("Hello ");
    expect(results).toContain("Hello World");
  });

  it("handles partial buffer splits across reads", async () => {
    const full = `event: response.output_text.delta\ndata: ${JSON.stringify({ type: "response.output_text.delta", delta: "split" })}\n\n`;
    const mid = Math.floor(full.length / 2);
    const part1 = new TextEncoder().encode(full.slice(0, mid));
    const part2 = new TextEncoder().encode(full.slice(mid));

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      mockFetchResponse(mockStream(part1, part2))
    ));

    const results = await collectResults(enkiAdapter);
    expect(results).toContain("split");
  });

  it("syncs final text from response.completed event", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      mockFetchResponse(mockStream(deltaEvent("partial"), completedEvent("full text")))
    ));

    const results = await collectResults(enkiAdapter);
    expect(results.at(-1)).toBe("full text");
  });

  it("skips response.completed when text matches accumulated", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      mockFetchResponse(mockStream(deltaEvent("exact"), completedEvent("exact")))
    ));

    const results = await collectResults(enkiAdapter);
    // Should only yield once from the delta, not again from completed
    expect(results).toEqual(["exact"]);
  });

  it("yields error on fetch failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    const results = await collectResults(enkiAdapter);
    expect(results[0]).toBe("Error: Failed to connect to server");
  });

  it("yields error on non-OK response with JSON error body", async () => {
    const response = {
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      body: null,
      headers: new Headers(),
      json: () => Promise.resolve({ error: { message: "Invalid API key" } }),
    } as unknown as Response;

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    const results = await collectResults(enkiAdapter);
    expect(results[0]).toBe("Error: Invalid API key");
  });

  it("yields error on non-OK response without parseable body", async () => {
    const response = {
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      body: null,
      headers: new Headers(),
      json: () => Promise.reject(new Error("not json")),
    } as unknown as Response;

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    const results = await collectResults(enkiAdapter);
    expect(results[0]).toBe("Error: 500 Internal Server Error");
  });

  it("handles [DONE] terminal marker", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      mockFetchResponse(mockStream(deltaEvent("text"), sseChunk("[DONE]")))
    ));

    const results = await collectResults(enkiAdapter);
    expect(results).toContain("text");
    expect(results.every((r) => !r.includes("[DONE]"))).toBe(true);
  });

  it("detects inline SSE error objects", async () => {
    const errorData = JSON.stringify({ error: { message: "Rate limit exceeded" } });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      mockFetchResponse(mockStream(sseChunk(errorData)))
    ));

    const results = await collectResults(enkiAdapter);
    expect(results.at(-1)).toContain("Rate limit exceeded");
  });

  it("skips unparseable JSON lines", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      mockFetchResponse(mockStream(sseChunk("not-json"), deltaEvent("ok")))
    ));

    const results = await collectResults(enkiAdapter);
    expect(results).toContain("ok");
  });

  it("yields error when response body is null", async () => {
    const response = {
      ok: true,
      status: 200,
      statusText: "OK",
      body: null,
      headers: new Headers(),
      json: () => Promise.resolve({}),
    } as unknown as Response;

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    const results = await collectResults(enkiAdapter);
    expect(results[0]).toBe("Error: No response stream");
  });
});
