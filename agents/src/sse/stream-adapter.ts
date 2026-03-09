import type { Logger } from "../infrastructure/logger.js";
import {
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
} from "./events.js";

/**
 * Extracts text content from a LangGraph stream item.
 * streamMode: "messages" yields [MessageChunk, metadata] tuples;
 * static/test streams yield plain { content: string } objects.
 */
function extractContent(item: unknown): string {
  const message = Array.isArray(item) ? item[0] : item;
  if (message && typeof message === "object" && "content" in message) {
    const content = (message as { content: unknown }).content;
    return typeof content === "string" ? content : "";
  }
  return "";
}

/**
 * Creates an SSE response stream from a LangGraph message stream.
 * Transforms LangGraph stream events into OpenAI Responses API SSE format.
 */
export function createSseStream(
  graphStream: AsyncIterable<unknown>,
  logger: Logger,
): ReadableStream {
  const encoder = new TextEncoder();
  const ids = generateIds();
  let fullText = "";
  let seq = 0;

  return new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(responseCreated(ids, seq++)));
        controller.enqueue(encoder.encode(outputItemAdded(ids, seq++)));
        controller.enqueue(encoder.encode(contentPartAdded(ids, seq++)));

        for await (const item of graphStream) {
          const content = extractContent(item);
          if (content) {
            fullText += content;
            controller.enqueue(
              encoder.encode(outputTextDelta(ids, seq++, content)),
            );
          }
        }

        controller.enqueue(encoder.encode(outputTextDone(ids, seq++, fullText)));
        controller.enqueue(encoder.encode(contentPartDone(ids, seq++, fullText)));
        controller.enqueue(encoder.encode(outputItemDone(ids, seq++, fullText)));
        controller.enqueue(encoder.encode(responseCompleted(ids, seq++, fullText)));
        controller.close();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error during streaming";
        logger.error("Graph stream error", { error: message });
        controller.enqueue(
          encoder.encode(createErrorSseEvent("llm_error", message)),
        );
        controller.close();
      }
    },
  });
}
