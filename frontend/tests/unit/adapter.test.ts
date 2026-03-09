import { describe, it, expect, vi, beforeEach } from "vitest";

// Reset module state between tests
let normalizeUrl: typeof import("../../src/api/adapter").normalizeUrl;
let setApiKey: typeof import("../../src/api/adapter").setApiKey;
let setSources: typeof import("../../src/api/adapter").setSources;
let enkiAdapter: typeof import("../../src/api/adapter").enkiAdapter;
let fetchDemos: typeof import("../../src/api/adapter").fetchDemos;
let setSelectedDemo: typeof import("../../src/api/adapter").setSelectedDemo;
let getSelectedDemo: typeof import("../../src/api/adapter").getSelectedDemo;

beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal("fetch", vi.fn());
  const mod = await import("../../src/api/adapter");
  normalizeUrl = mod.normalizeUrl;
  setApiKey = mod.setApiKey;
  setSources = mod.setSources;
  enkiAdapter = mod.enkiAdapter;
  fetchDemos = mod.fetchDemos;
  setSelectedDemo = mod.setSelectedDemo;
  getSelectedDemo = mod.getSelectedDemo;
});

function sseChunk(data: string): Uint8Array {
  return new TextEncoder().encode(`data: ${data}\n\n`);
}

function deltaEvent(text: string, seq: number = 0): Uint8Array {
  return new TextEncoder().encode(
    `event: response.output_text.delta\ndata: ${JSON.stringify({ type: "response.output_text.delta", sequence_number: seq, item_id: "msg_1", output_index: 0, content_index: 0, delta: text })}\n\n`,
  );
}

function completedEvent(fullText: string, seq: number = 0): Uint8Array {
  return new TextEncoder().encode(
    `event: response.completed\ndata: ${JSON.stringify({
      type: "response.completed",
      sequence_number: seq,
      response: {
        id: "resp_test",
        object: "response",
        created_at: 1700000000,
        status: "completed",
        model: "enki-agent-v1",
        output: [{ type: "message", id: "msg_1", status: "completed", role: "assistant", content: [{ type: "output_text", text: fullText, annotations: [] }] }],
        usage: null,
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

interface TextPart {
  type: "text";
  text: string;
}

async function collectResults(adapter: typeof enkiAdapter): Promise<TextPart[][]> {
  const results: TextPart[][] = [];
  const gen = adapter.run({ messages: [], abortSignal: new AbortController().signal });
  for await (const msg of gen) {
    const parts = msg.content?.filter(
      (p): p is TextPart => p.type === "text",
    ) ?? [];
    if (parts.length > 0) results.push(parts);
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

  it("accumulates deltas into a single growing text part", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      mockFetchResponse(mockStream(deltaEvent("Hello ", 3), deltaEvent("World", 4)))
    ));

    const results = await collectResults(enkiAdapter);

    // First yield: accumulated so far
    expect(results[0]).toHaveLength(1);
    expect(results[0][0].text).toBe("Hello ");

    // Second yield: single part with concatenated text
    expect(results[1]).toHaveLength(1);
    expect(results[1][0].text).toBe("Hello World");
  });

  it("handles partial buffer splits across reads", async () => {
    const full = `event: response.output_text.delta\ndata: ${JSON.stringify({ type: "response.output_text.delta", sequence_number: 0, item_id: "msg_1", output_index: 0, content_index: 0, delta: "split" })}\n\n`;
    const mid = Math.floor(full.length / 2);
    const part1 = new TextEncoder().encode(full.slice(0, mid));
    const part2 = new TextEncoder().encode(full.slice(mid));

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      mockFetchResponse(mockStream(part1, part2))
    ));

    const results = await collectResults(enkiAdapter);
    expect(results[0][0].text).toBe("split");
  });

  it("syncs final text from response.completed event", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      mockFetchResponse(mockStream(deltaEvent("partial", 3), completedEvent("full text", 7)))
    ));

    const results = await collectResults(enkiAdapter);
    // Last yield should be the completed final text as a single part
    const last = results.at(-1)!;
    expect(last).toHaveLength(1);
    expect(last[0].text).toBe("full text");
  });

  it("skips response.completed when text matches accumulated", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      mockFetchResponse(mockStream(deltaEvent("exact", 3), completedEvent("exact", 7)))
    ));

    const results = await collectResults(enkiAdapter);
    // Should only yield once from the delta, not again from completed
    expect(results).toHaveLength(1);
    expect(results[0][0].text).toBe("exact");
  });

  it("yields error on fetch failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    const results = await collectResults(enkiAdapter);
    expect(results[0][0].text).toBe("Error: Failed to connect to server");
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
    expect(results[0][0].text).toBe("Error: Invalid API key");
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
    expect(results[0][0].text).toBe("Error: 500 Internal Server Error");
  });

  it("handles [DONE] terminal marker", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      mockFetchResponse(mockStream(deltaEvent("text", 3), sseChunk("[DONE]")))
    ));

    const results = await collectResults(enkiAdapter);
    expect(results[0][0].text).toBe("text");
    expect(results.every((r) => r.every((p) => !p.text.includes("[DONE]")))).toBe(true);
  });

  it("detects inline SSE error objects", async () => {
    const errorData = JSON.stringify({ error: { message: "Rate limit exceeded" } });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      mockFetchResponse(mockStream(sseChunk(errorData)))
    ));

    const results = await collectResults(enkiAdapter);
    expect(results.at(-1)!.at(-1)!.text).toContain("Rate limit exceeded");
  });

  it("skips unparseable JSON lines", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      mockFetchResponse(mockStream(sseChunk("not-json"), deltaEvent("ok", 3)))
    ));

    const results = await collectResults(enkiAdapter);
    expect(results[0][0].text).toBe("ok");
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
    expect(results[0][0].text).toBe("Error: No response stream");
  });
});

describe("fetchDemos", () => {
  it("fetches demos with auth header", async () => {
    const mockDemos = [{ id: "outline", name: "Outline", description: "Test" }];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ demos: mockDemos }),
    });
    vi.stubGlobal("fetch", fetchMock);

    setApiKey("test-key");
    const result = await fetchDemos();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/demos");
    expect(opts.headers.Authorization).toBe("Bearer test-key");
    expect(result.demos).toEqual(mockDemos);
    expect(result.error).toBeUndefined();
  });

  it("returns error on non-OK response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: { message: "Unauthorized" } }),
    }));

    const result = await fetchDemos();
    expect(result.demos).toEqual([]);
    expect(result.error).toBe("Unauthorized");
  });

  it("returns error on network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    const result = await fetchDemos();
    expect(result.demos).toEqual([]);
    expect(result.error).toBe("Failed to connect to server");
  });
});

describe("selectedDemo", () => {
  it("tracks selected demo", () => {
    const demo = { id: "outline", name: "Outline", description: "Test" };
    setSelectedDemo(demo);
    expect(getSelectedDemo()).toEqual(demo);
  });
});
