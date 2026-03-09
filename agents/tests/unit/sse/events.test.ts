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
import {
  ResponseCreatedEventSchema,
  OutputItemAddedEventSchema,
  ContentPartAddedEventSchema,
  OutputTextDeltaEventSchema,
  OutputTextDoneEventSchema,
  ContentPartDoneEventSchema,
  OutputItemDoneEventSchema,
  ResponseCompletedEventSchema,
} from "../../../src/sse/schema.js";

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

  it("responseCreated emits correct event and validates against schema", () => {
    const event = responseCreated(ids, 0);
    expect(event).toContain("event: response.created\n");
    const data = parseData(event);
    expect(data.type).toBe("response.created");
    expect(data.sequence_number).toBe(0);
    expect(data.response.id).toBe("resp_test-123");
    expect(data.response.status).toBe("in_progress");
    expect(data.response.model).toBe("enki-agent-v1");
    expect(ResponseCreatedEventSchema.safeParse(data).success).toBe(true);
  });

  it("outputItemAdded emits correct event and validates against schema", () => {
    const event = outputItemAdded(ids, 1);
    const data = parseData(event);
    expect(data.type).toBe("response.output_item.added");
    expect(data.sequence_number).toBe(1);
    expect(data.item.id).toBe("msg_test-456");
    expect(data.item.role).toBe("assistant");
    expect(OutputItemAddedEventSchema.safeParse(data).success).toBe(true);
  });

  it("contentPartAdded emits correct event and validates against schema", () => {
    const event = contentPartAdded(ids, 2);
    const data = parseData(event);
    expect(data.type).toBe("response.content_part.added");
    expect(data.sequence_number).toBe(2);
    expect(data.part.type).toBe("output_text");
    expect(ContentPartAddedEventSchema.safeParse(data).success).toBe(true);
  });

  it("outputTextDelta emits correct event and validates against schema", () => {
    const event = outputTextDelta(ids, 3, "Hello world");
    const data = parseData(event);
    expect(data.type).toBe("response.output_text.delta");
    expect(data.sequence_number).toBe(3);
    expect(data.delta).toBe("Hello world");
    expect(OutputTextDeltaEventSchema.safeParse(data).success).toBe(true);
  });

  it("outputTextDone emits correct event and validates against schema", () => {
    const event = outputTextDone(ids, 4, "Full text");
    const data = parseData(event);
    expect(data.type).toBe("response.output_text.done");
    expect(data.sequence_number).toBe(4);
    expect(data.text).toBe("Full text");
    expect(OutputTextDoneEventSchema.safeParse(data).success).toBe(true);
  });

  it("contentPartDone emits correct event and validates against schema", () => {
    const event = contentPartDone(ids, 5, "Full text");
    const data = parseData(event);
    expect(data.type).toBe("response.content_part.done");
    expect(data.sequence_number).toBe(5);
    expect(data.part.text).toBe("Full text");
    expect(ContentPartDoneEventSchema.safeParse(data).success).toBe(true);
  });

  it("outputItemDone emits correct event and validates against schema", () => {
    const event = outputItemDone(ids, 6, "Full text");
    const data = parseData(event);
    expect(data.type).toBe("response.output_item.done");
    expect(data.sequence_number).toBe(6);
    expect(data.item.status).toBe("completed");
    expect(data.item.content[0].text).toBe("Full text");
    expect(OutputItemDoneEventSchema.safeParse(data).success).toBe(true);
  });

  it("responseCompleted emits correct event and validates against schema", () => {
    const event = responseCompleted(ids, 7, "Full text");
    const data = parseData(event);
    expect(data.type).toBe("response.completed");
    expect(data.sequence_number).toBe(7);
    expect(data.response.status).toBe("completed");
    expect(data.response.model).toBe("enki-agent-v1");
    expect(data.response.output[0].content[0].text).toBe("Full text");
    expect(ResponseCompletedEventSchema.safeParse(data).success).toBe(true);
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
