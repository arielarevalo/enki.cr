import { SseEventSchema } from "./sse-schema.js";

export function createSseValidationStream(): TransformStream<
  Uint8Array,
  Uint8Array
> {
  let buffer = "";
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);

        if (!block.trim()) continue;

        const lines = block.split("\n");
        let eventType: string | undefined;
        let dataLine: string | undefined;

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7);
          } else if (line.startsWith("data: ")) {
            dataLine = line.slice(6);
          }
        }

        if (!eventType) {
          emitError(controller, encoder);
          return;
        }

        if (dataLine === undefined) {
          emitError(controller, encoder);
          return;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(dataLine);
        } catch {
          emitError(controller, encoder);
          return;
        }

        const result = SseEventSchema.safeParse(parsed);
        if (!result.success) {
          emitError(controller, encoder);
          return;
        }

        controller.enqueue(encoder.encode(block + "\n\n"));
      }
    },
    flush(controller) {
      if (buffer.trim()) {
        controller.enqueue(encoder.encode(buffer));
      }
    },
  });
}

function emitError(
  controller: TransformStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
): void {
  const errorEvent = `event: error\ndata: ${JSON.stringify({
    error: {
      type: "agent_error",
      message: "Agent response failed format validation",
    },
  })}\n\n`;
  controller.enqueue(encoder.encode(errorEvent));
  controller.terminate();
}
