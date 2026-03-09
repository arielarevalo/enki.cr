import { describe, it, expect, vi } from "vitest";
import { createSseStream } from "../../../src/sse/stream-adapter.js";
import type { Logger } from "../../../src/infrastructure/logger.js";

function createMockLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    withContext: vi.fn(() => createMockLogger()),
  };
}

async function readStream(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
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

describe("createSseStream", () => {
  it("transforms async iterator into SSE events", async () => {
    async function* mockStream() {
      yield { content: "Hello " };
      yield { content: "world" };
    }

    const stream = createSseStream(mockStream(), createMockLogger());
    const raw = await readStream(stream);
    const events = parseEvents(raw);

    expect(events.map((e) => e.event)).toEqual([
      "response.created",
      "response.output_item.added",
      "response.content_part.added",
      "response.output_text.delta",
      "response.output_text.delta",
      "response.output_text.done",
      "response.content_part.done",
      "response.output_item.done",
      "response.completed",
    ]);
  });

  it("handles [MessageChunk, metadata] tuples from streamMode messages", async () => {
    async function* mockStream() {
      yield [{ content: "Hello " }, { langgraph_node: "research" }];
      yield [{ content: "world" }, { langgraph_node: "research" }];
    }

    const stream = createSseStream(mockStream(), createMockLogger());
    const raw = await readStream(stream);
    const events = parseEvents(raw);

    const deltas = events.filter(
      (e) => e.event === "response.output_text.delta",
    );
    expect(deltas).toHaveLength(2);
    expect((deltas[0].data as { delta: string }).delta).toBe("Hello ");
    expect((deltas[1].data as { delta: string }).delta).toBe("world");
  });

  it("skips tuples with non-string content", async () => {
    async function* mockStream() {
      yield [{ content: [{ type: "tool_use" }] }, { langgraph_node: "n" }];
      yield [{ content: "text" }, { langgraph_node: "n" }];
    }

    const stream = createSseStream(mockStream(), createMockLogger());
    const raw = await readStream(stream);
    const events = parseEvents(raw);

    const deltas = events.filter(
      (e) => e.event === "response.output_text.delta",
    );
    expect(deltas).toHaveLength(1);
    expect((deltas[0].data as { delta: string }).delta).toBe("text");
  });

  it("assigns incrementing sequence_number to each event", async () => {
    async function* mockStream() {
      yield { content: "text" };
    }

    const stream = createSseStream(mockStream(), createMockLogger());
    const raw = await readStream(stream);
    const events = parseEvents(raw);

    events.forEach((e, i) => {
      expect((e.data as { sequence_number: number }).sequence_number).toBe(i);
    });
  });

  it("accumulates full text across deltas", async () => {
    async function* mockStream() {
      yield { content: "part1" };
      yield { content: "part2" };
    }

    const stream = createSseStream(mockStream(), createMockLogger());
    const raw = await readStream(stream);
    const events = parseEvents(raw);

    const doneEvent = events.find((e) => e.event === "response.output_text.done");
    expect((doneEvent?.data as { text: string }).text).toBe("part1part2");
  });

  it("emits error SSE event on stream failure", async () => {
    async function* failingStream() {
      yield { content: "ok " };
      throw new Error("LLM crashed");
    }

    const logger = createMockLogger();
    const stream = createSseStream(failingStream(), logger);
    const raw = await readStream(stream);
    const events = parseEvents(raw);

    const errorEvent = events.find((e) => e.event === "error");
    expect(errorEvent).toBeDefined();
    expect(
      (errorEvent?.data as { error: { type: string; message: string } }).error
        .type,
    ).toBe("llm_error");
  });

  it("handles empty content chunks", async () => {
    async function* mockStream() {
      yield { content: "" };
      yield { content: "text" };
      yield {};
    }

    const stream = createSseStream(mockStream(), createMockLogger());
    const raw = await readStream(stream);
    const events = parseEvents(raw);

    const deltas = events.filter(
      (e) => e.event === "response.output_text.delta",
    );
    expect(deltas).toHaveLength(1);
    expect((deltas[0].data as { delta: string }).delta).toBe("text");
  });
});
