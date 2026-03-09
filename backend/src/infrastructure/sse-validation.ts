const KNOWN_EVENT_TYPES = new Set([
  "response.created",
  "response.output_item.added",
  "response.content_part.added",
  "response.output_text.delta",
  "response.output_text.done",
  "response.content_part.done",
  "response.output_item.done",
  "response.completed",
]);

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

        if (typeof parsed !== "object" || parsed === null) {
          emitError(controller, encoder);
          return;
        }

        const data = parsed as Record<string, unknown>;
        if (typeof data.type !== "string" || !KNOWN_EVENT_TYPES.has(data.type)) {
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
