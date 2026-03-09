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
 * Creates an SSE response stream from a LangGraph message stream.
 * Transforms LangGraph stream events into OpenAI Responses API SSE format.
 */
export function createLangGraphSseStream(
  graphStream: AsyncIterable<{ content?: string }>,
  logger: Logger,
): ReadableStream {
  const encoder = new TextEncoder();
  const ids = generateIds();
  let fullText = "";

  return new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(responseCreated(ids)));
        controller.enqueue(encoder.encode(outputItemAdded(ids)));
        controller.enqueue(encoder.encode(contentPartAdded(ids)));

        for await (const chunk of graphStream) {
          const content =
            typeof chunk.content === "string" ? chunk.content : "";
          if (content) {
            fullText += content;
            controller.enqueue(
              encoder.encode(outputTextDelta(ids, content)),
            );
          }
        }

        controller.enqueue(encoder.encode(outputTextDone(ids, fullText)));
        controller.enqueue(encoder.encode(contentPartDone(ids, fullText)));
        controller.enqueue(encoder.encode(outputItemDone(ids, fullText)));
        controller.enqueue(encoder.encode(responseCompleted(ids, fullText)));
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

/**
 * Creates a mock SSE response stream (preserves original behavior).
 */
export function createMockResponseStream(sources: string[]): ReadableStream {
  const encoder = new TextEncoder();
  const ids = generateIds();

  const fullText = JSON.stringify({
    message: "Hello from Enki",
    sources_received: sources,
  });

  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(responseCreated(ids)));
      controller.enqueue(encoder.encode(outputItemAdded(ids)));
      controller.enqueue(encoder.encode(contentPartAdded(ids)));
      controller.enqueue(encoder.encode(outputTextDelta(ids, fullText)));
      controller.enqueue(encoder.encode(outputTextDone(ids, fullText)));
      controller.enqueue(encoder.encode(contentPartDone(ids, fullText)));
      controller.enqueue(encoder.encode(outputItemDone(ids, fullText)));
      controller.enqueue(encoder.encode(responseCompleted(ids, fullText)));
      controller.close();
    },
  });
}
