import type {
  ResponseCreatedEvent,
  OutputItemAddedEvent,
  ContentPartAddedEvent,
  OutputTextDeltaEvent,
  OutputTextDoneEvent,
  ContentPartDoneEvent,
  OutputItemDoneEvent,
  ResponseCompletedEvent,
} from "./schema.js";

const MODEL = "enki-agent-v1";

export function sseEvent(event: string, data: object): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

interface SseIds {
  responseId: string;
  messageId: string;
  createdAt: number;
}

export function generateIds(): SseIds {
  return {
    responseId: `resp_${crypto.randomUUID()}`,
    messageId: `msg_${crypto.randomUUID()}`,
    createdAt: Math.floor(Date.now() / 1000),
  };
}

export function responseCreated(ids: SseIds, seq: number): string {
  const data: ResponseCreatedEvent = {
    type: "response.created",
    sequence_number: seq,
    response: {
      id: ids.responseId,
      object: "response",
      created_at: ids.createdAt,
      status: "in_progress",
      model: MODEL,
      output: [],
      usage: null,
    },
  };
  return sseEvent("response.created", data);
}

export function outputItemAdded(ids: SseIds, seq: number): string {
  const data: OutputItemAddedEvent = {
    type: "response.output_item.added",
    sequence_number: seq,
    output_index: 0,
    item: {
      type: "message",
      id: ids.messageId,
      status: "in_progress",
      role: "assistant",
      content: [],
    },
  };
  return sseEvent("response.output_item.added", data);
}

export function contentPartAdded(ids: SseIds, seq: number): string {
  const data: ContentPartAddedEvent = {
    type: "response.content_part.added",
    sequence_number: seq,
    item_id: ids.messageId,
    output_index: 0,
    content_index: 0,
    part: { type: "output_text", text: "", annotations: [] },
  };
  return sseEvent("response.content_part.added", data);
}

export function outputTextDelta(
  ids: SseIds,
  seq: number,
  delta: string,
): string {
  const data: OutputTextDeltaEvent = {
    type: "response.output_text.delta",
    sequence_number: seq,
    item_id: ids.messageId,
    output_index: 0,
    content_index: 0,
    delta,
  };
  return sseEvent("response.output_text.delta", data);
}

export function outputTextDone(
  ids: SseIds,
  seq: number,
  text: string,
): string {
  const data: OutputTextDoneEvent = {
    type: "response.output_text.done",
    sequence_number: seq,
    item_id: ids.messageId,
    output_index: 0,
    content_index: 0,
    text,
  };
  return sseEvent("response.output_text.done", data);
}

export function contentPartDone(
  ids: SseIds,
  seq: number,
  text: string,
): string {
  const data: ContentPartDoneEvent = {
    type: "response.content_part.done",
    sequence_number: seq,
    item_id: ids.messageId,
    output_index: 0,
    content_index: 0,
    part: { type: "output_text", text, annotations: [] },
  };
  return sseEvent("response.content_part.done", data);
}

export function outputItemDone(
  ids: SseIds,
  seq: number,
  text: string,
): string {
  const data: OutputItemDoneEvent = {
    type: "response.output_item.done",
    sequence_number: seq,
    output_index: 0,
    item: {
      type: "message",
      id: ids.messageId,
      status: "completed",
      role: "assistant",
      content: [{ type: "output_text", text, annotations: [] }],
    },
  };
  return sseEvent("response.output_item.done", data);
}

export function responseCompleted(
  ids: SseIds,
  seq: number,
  text: string,
): string {
  const data: ResponseCompletedEvent = {
    type: "response.completed",
    sequence_number: seq,
    response: {
      id: ids.responseId,
      object: "response",
      created_at: ids.createdAt,
      status: "completed",
      model: MODEL,
      output: [
        {
          type: "message",
          id: ids.messageId,
          status: "completed",
          role: "assistant",
          content: [{ type: "output_text", text, annotations: [] }],
        },
      ],
      usage: null,
    },
  };
  return sseEvent("response.completed", data);
}

export type ErrorType =
  | "llm_error"
  | "timeout_error"
  | "validation_error"
  | "internal_error";

export function createErrorSseEvent(type: ErrorType, message: string): string {
  return sseEvent("error", {
    error: { type, message },
  });
}
