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

export function responseCreated(ids: SseIds): string {
  return sseEvent("response.created", {
    type: "response.created",
    response: {
      id: ids.responseId,
      object: "response",
      created_at: ids.createdAt,
      status: "in_progress",
      output: [],
    },
  });
}

export function outputItemAdded(ids: SseIds): string {
  return sseEvent("response.output_item.added", {
    type: "response.output_item.added",
    output_index: 0,
    item: {
      type: "message",
      id: ids.messageId,
      status: "in_progress",
      role: "assistant",
      content: [],
    },
  });
}

export function contentPartAdded(ids: SseIds): string {
  return sseEvent("response.content_part.added", {
    type: "response.content_part.added",
    item_id: ids.messageId,
    output_index: 0,
    content_index: 0,
    part: { type: "output_text", text: "", annotations: [] },
  });
}

export function outputTextDelta(ids: SseIds, delta: string): string {
  return sseEvent("response.output_text.delta", {
    type: "response.output_text.delta",
    item_id: ids.messageId,
    output_index: 0,
    content_index: 0,
    delta,
  });
}

export function outputTextDone(ids: SseIds, text: string): string {
  return sseEvent("response.output_text.done", {
    type: "response.output_text.done",
    item_id: ids.messageId,
    output_index: 0,
    content_index: 0,
    text,
  });
}

export function contentPartDone(ids: SseIds, text: string): string {
  const part = { type: "output_text", text, annotations: [] };
  return sseEvent("response.content_part.done", {
    type: "response.content_part.done",
    item_id: ids.messageId,
    output_index: 0,
    content_index: 0,
    part,
  });
}

export function outputItemDone(ids: SseIds, text: string): string {
  const completedItem = {
    type: "message",
    id: ids.messageId,
    status: "completed",
    role: "assistant",
    content: [{ type: "output_text", text, annotations: [] }],
  };
  return sseEvent("response.output_item.done", {
    type: "response.output_item.done",
    output_index: 0,
    item: completedItem,
  });
}

export function responseCompleted(ids: SseIds, text: string): string {
  const completedItem = {
    type: "message",
    id: ids.messageId,
    status: "completed",
    role: "assistant",
    content: [{ type: "output_text", text, annotations: [] }],
  };
  return sseEvent("response.completed", {
    type: "response.completed",
    response: {
      id: ids.responseId,
      object: "response",
      created_at: ids.createdAt,
      status: "completed",
      output: [completedItem],
    },
  });
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
