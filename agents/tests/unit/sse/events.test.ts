import { describe, it, expect } from "vitest";
import {
  sseEvent,
  generateIds,
  responseCreated,
  outputItemAdded,
  contentPartAdded,
  outputTextDelta,
  outputTextDone,
  contentPartDone,
  outputItemDone,
  responseCompleted,
  createErrorSseEvent,
} from "../../../src/sse/events.js";

describe("sseEvent", () => {
  it("formats SSE event with event type and JSON data", () => {
    const result = sseEvent("test.event", { type: "test.event", value: 42 });
    expect(result).toBe(
      'event: test.event\ndata: {"type":"test.event","value":42}\n\n',
    );
  });
});

describe("generateIds", () => {
  it("generates unique response and message IDs", () => {
    const ids = generateIds();
    expect(ids.responseId).toMatch(/^resp_/);
    expect(ids.messageId).toMatch(/^msg_/);
    expect(ids.createdAt).toBeTypeOf("number");
  });

  it("generates different IDs on each call", () => {
    const a = generateIds();
    const b = generateIds();
    expect(a.responseId).not.toBe(b.responseId);
    expect(a.messageId).not.toBe(b.messageId);
  });
});

describe("SSE event builders", () => {
  const ids = {
    responseId: "resp_test-123",
    messageId: "msg_test-456",
    createdAt: 1700000000,
  };

  it("responseCreated emits correct event", () => {
    const event = responseCreated(ids);
    expect(event).toContain("event: response.created\n");
    const data = parseData(event);
    expect(data.type).toBe("response.created");
    expect(data.response.id).toBe("resp_test-123");
    expect(data.response.status).toBe("in_progress");
  });

  it("outputItemAdded emits correct event", () => {
    const event = outputItemAdded(ids);
    const data = parseData(event);
    expect(data.type).toBe("response.output_item.added");
    expect(data.item.id).toBe("msg_test-456");
    expect(data.item.role).toBe("assistant");
  });

  it("contentPartAdded emits correct event", () => {
    const event = contentPartAdded(ids);
    const data = parseData(event);
    expect(data.type).toBe("response.content_part.added");
    expect(data.part.type).toBe("output_text");
  });

  it("outputTextDelta emits correct event", () => {
    const event = outputTextDelta(ids, "Hello world");
    const data = parseData(event);
    expect(data.type).toBe("response.output_text.delta");
    expect(data.delta).toBe("Hello world");
  });

  it("outputTextDone emits correct event", () => {
    const event = outputTextDone(ids, "Full text");
    const data = parseData(event);
    expect(data.type).toBe("response.output_text.done");
    expect(data.text).toBe("Full text");
  });

  it("contentPartDone emits correct event", () => {
    const event = contentPartDone(ids, "Full text");
    const data = parseData(event);
    expect(data.type).toBe("response.content_part.done");
    expect(data.part.text).toBe("Full text");
  });

  it("outputItemDone emits correct event", () => {
    const event = outputItemDone(ids, "Full text");
    const data = parseData(event);
    expect(data.type).toBe("response.output_item.done");
    expect(data.item.status).toBe("completed");
    expect(data.item.content[0].text).toBe("Full text");
  });

  it("responseCompleted emits correct event", () => {
    const event = responseCompleted(ids, "Full text");
    const data = parseData(event);
    expect(data.type).toBe("response.completed");
    expect(data.response.status).toBe("completed");
    expect(data.response.output[0].content[0].text).toBe("Full text");
  });
});

describe("createErrorSseEvent", () => {
  it("formats error event correctly", () => {
    const event = createErrorSseEvent("llm_error", "Model timeout");
    expect(event).toContain("event: error\n");
    const data = parseData(event);
    expect(data.error.type).toBe("llm_error");
    expect(data.error.message).toBe("Model timeout");
  });

  it("supports all error types", () => {
    const types = [
      "llm_error",
      "timeout_error",
      "validation_error",
      "internal_error",
    ] as const;
    for (const type of types) {
      const event = createErrorSseEvent(type, "test");
      const data = parseData(event);
      expect(data.error.type).toBe(type);
    }
  });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseData(event: string): any {
  const dataLine = event.split("\n").find((l) => l.startsWith("data: "));
  if (!dataLine) throw new Error("No data line found");
  return JSON.parse(dataLine.slice(6));
}
