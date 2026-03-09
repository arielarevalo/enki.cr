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
        const event = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);

        if (!event.trim()) continue;

        const lines = event.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed: unknown = JSON.parse(data);
            if (!isValidChunk(parsed)) {
              emitError(controller, encoder);
              return;
            }
          } catch {
            emitError(controller, encoder);
            return;
          }
        }

        controller.enqueue(encoder.encode(event + "\n\n"));
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
  const errorEvent = `data: ${JSON.stringify({
    error: {
      type: "agent_error",
      message: "Agent response failed format validation",
    },
  })}\n\ndata: [DONE]\n\n`;
  controller.enqueue(encoder.encode(errorEvent));
  controller.terminate();
}

function isValidChunk(data: unknown): boolean {
  if (typeof data !== "object" || data === null) return false;
  const chunk = data as Record<string, unknown>;
  return (
    typeof chunk.id === "string" &&
    chunk.object === "chat.completion.chunk" &&
    typeof chunk.created === "number" &&
    Array.isArray(chunk.choices)
  );
}
