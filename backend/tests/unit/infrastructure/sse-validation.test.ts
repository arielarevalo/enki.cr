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

function validChunkJson(): string {
  return JSON.stringify({
    id: "chatcmpl-1",
    object: "chat.completion.chunk",
    created: 1700000000,
    choices: [{ delta: { content: "hello" } }],
  });
}

describe("createSseValidationStream", () => {
  it("passes valid SSE chunks through", async () => {
    const stream = createSseValidationStream();
    const input = `data: ${validChunkJson()}\n\n`;

    const output = await pipeChunks(stream, [input]);

    expect(output).toBe(input);
  });

  it("emits an error event and terminates on invalid JSON", async () => {
    const stream = createSseValidationStream();
    const input = `data: {not valid json\n\n`;

    const output = await pipeChunks(stream, [input]);

    expect(output).toContain("agent_error");
    expect(output).toContain("Agent response failed format validation");
    expect(output).toContain("data: [DONE]");
  });

  it("emits an error event when required field 'id' is missing", async () => {
    const stream = createSseValidationStream();
    const invalid = JSON.stringify({
      object: "chat.completion.chunk",
      created: 1700000000,
      choices: [],
    });
    const input = `data: ${invalid}\n\n`;

    const output = await pipeChunks(stream, [input]);

    expect(output).toContain("agent_error");
    expect(output).toContain("data: [DONE]");
  });

  it("emits an error event when required field 'object' is wrong", async () => {
    const stream = createSseValidationStream();
    const invalid = JSON.stringify({
      id: "chatcmpl-1",
      object: "wrong_type",
      created: 1700000000,
      choices: [],
    });
    const input = `data: ${invalid}\n\n`;

    const output = await pipeChunks(stream, [input]);

    expect(output).toContain("agent_error");
  });

  it("emits an error event when required field 'created' is missing", async () => {
    const stream = createSseValidationStream();
    const invalid = JSON.stringify({
      id: "chatcmpl-1",
      object: "chat.completion.chunk",
      choices: [],
    });
    const input = `data: ${invalid}\n\n`;

    const output = await pipeChunks(stream, [input]);

    expect(output).toContain("agent_error");
  });

  it("emits an error event when required field 'choices' is missing", async () => {
    const stream = createSseValidationStream();
    const invalid = JSON.stringify({
      id: "chatcmpl-1",
      object: "chat.completion.chunk",
      created: 1700000000,
    });
    const input = `data: ${invalid}\n\n`;

    const output = await pipeChunks(stream, [input]);

    expect(output).toContain("agent_error");
  });

  it("passes data: [DONE] through without validation", async () => {
    const stream = createSseValidationStream();
    const input = `data: ${validChunkJson()}\n\ndata: [DONE]\n\n`;

    const output = await pipeChunks(stream, [input]);

    expect(output).toContain(validChunkJson());
    expect(output).toContain("data: [DONE]");
  });

  it("handles cross-chunk buffering when a message is split across chunks", async () => {
    const stream = createSseValidationStream();
    const fullMessage = `data: ${validChunkJson()}\n\n`;
    const splitAt = Math.floor(fullMessage.length / 2);
    const chunk1 = fullMessage.slice(0, splitAt);
    const chunk2 = fullMessage.slice(splitAt);

    const output = await pipeChunks(stream, [chunk1, chunk2]);

    expect(output).toBe(fullMessage);
  });
});
