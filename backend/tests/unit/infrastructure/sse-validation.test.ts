import { describe, it, expect } from "vitest";
import { createSseValidationStream } from "../../../src/infrastructure/sse-validation.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function pipeChunks(
  stream: TransformStream<Uint8Array, Uint8Array>,
  chunks: string[],
): Promise<string> {
  const writePromise = (async () => {
    const writer = stream.writable.getWriter();
    for (const chunk of chunks) {
      try {
        await writer.write(encoder.encode(chunk));
      } catch {
        return;
      }
    }
    try {
      await writer.close();
    } catch {
      // writable may already be errored if transform terminated early
    }
  })();

  const readPromise = (async () => {
    const reader = stream.readable.getReader();
    let output = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      output += decoder.decode(value);
    }
    return output;
  })();

  const [, output] = await Promise.all([writePromise, readPromise]);
  return output;
}

function validEvent(
  eventType: string = "response.output_text.delta",
  data: Record<string, unknown> = { type: "response.output_text.delta", delta: "hello" },
): string {
  return `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
}

describe("createSseValidationStream", () => {
  it("passes valid named SSE event through", async () => {
    const stream = createSseValidationStream();
    const input = validEvent();

    const output = await pipeChunks(stream, [input]);

    expect(output).toBe(input);
  });

  it("emits error when event: line is missing", async () => {
    const stream = createSseValidationStream();
    const input = `data: ${JSON.stringify({ type: "response.created" })}\n\n`;

    const output = await pipeChunks(stream, [input]);

    expect(output).toContain("agent_error");
    expect(output).toContain("Agent response failed format validation");
  });

  it("emits error on invalid JSON in data line", async () => {
    const stream = createSseValidationStream();
    const input = `event: response.created\ndata: {not valid json\n\n`;

    const output = await pipeChunks(stream, [input]);

    expect(output).toContain("agent_error");
    expect(output).toContain("Agent response failed format validation");
  });

  it("emits error when type field is missing in data", async () => {
    const stream = createSseValidationStream();
    const input = `event: response.created\ndata: ${JSON.stringify({ response: { id: "resp_1" } })}\n\n`;

    const output = await pipeChunks(stream, [input]);

    expect(output).toContain("agent_error");
  });

  it("emits error on unknown event type", async () => {
    const stream = createSseValidationStream();
    const input = `event: response.unknown\ndata: ${JSON.stringify({ type: "response.unknown" })}\n\n`;

    const output = await pipeChunks(stream, [input]);

    expect(output).toContain("agent_error");
  });

  it("handles cross-chunk buffering when a message is split across chunks", async () => {
    const stream = createSseValidationStream();
    const fullMessage = validEvent();
    const splitAt = Math.floor(fullMessage.length / 2);
    const chunk1 = fullMessage.slice(0, splitAt);
    const chunk2 = fullMessage.slice(splitAt);

    const output = await pipeChunks(stream, [chunk1, chunk2]);

    expect(output).toBe(fullMessage);
  });

  it("passes full event sequence through", async () => {
    const stream = createSseValidationStream();
    const events = [
      validEvent("response.created", { type: "response.created", response: { id: "resp_1", object: "response", created_at: 1700000000, status: "in_progress", output: [] } }),
      validEvent("response.output_item.added", { type: "response.output_item.added", item: { id: "msg_1", type: "message" } }),
      validEvent("response.content_part.added", { type: "response.content_part.added", part: { type: "output_text", text: "" } }),
      validEvent("response.output_text.delta", { type: "response.output_text.delta", delta: "Hello" }),
      validEvent("response.output_text.done", { type: "response.output_text.done", text: "Hello" }),
      validEvent("response.content_part.done", { type: "response.content_part.done", part: { type: "output_text", text: "Hello" } }),
      validEvent("response.output_item.done", { type: "response.output_item.done", item: { id: "msg_1", type: "message" } }),
      validEvent("response.completed", { type: "response.completed", response: { id: "resp_1", object: "response", created_at: 1700000000, status: "completed", output: [] } }),
    ];
    const input = events.join("");

    const output = await pipeChunks(stream, [input]);

    expect(output).toBe(input);
  });
});
