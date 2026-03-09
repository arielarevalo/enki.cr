import type { AgentProvider } from "../abstractions/agent-provider.js";
import type { DataStore } from "../abstractions/data-store.js";
import type { Logger } from "../abstractions/logger.js";
import { authenticate } from "../middleware/auth.js";
import { createSseValidationStream } from "../middleware/validate-sse.js";
import { errorResponse } from "../errors.js";

export async function handleOutlineProcess(
  request: Request,
  store: DataStore,
  agents: AgentProvider,
  logger: Logger,
): Promise<Response> {
  const auth = await authenticate(request, store, ["client", "admin"]);
  if (auth instanceof Response) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_request", "Invalid JSON body");
  }

  const validationError = validateProcessRequest(body);
  if (validationError) return validationError;

  const { sources } = body as { sources: string[] };

  const activeAgent = await store.getSetting("active_agent");
  if (!activeAgent) {
    return errorResponse(500, "internal_error", "No active agent configured");
  }

  let stream: ReadableStream;
  try {
    logger.info("Invoking agent", { agent: activeAgent });
    stream = await agents.invoke(activeAgent, { sources });
  } catch (err) {
    logger.error("Agent invocation failed", {
      agent: activeAgent,
      error: String(err),
    });
    return errorResponse(502, "agent_error", "Failed to reach agent");
  }

  const validationStream = createSseValidationStream();
  const validated = stream.pipeThrough(validationStream);

  return new Response(validated, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function validateProcessRequest(body: unknown): Response | null {
  if (typeof body !== "object" || body === null) {
    return errorResponse(
      400,
      "invalid_request",
      "Request body must be a JSON object",
    );
  }

  const { sources } = body as Record<string, unknown>;

  if (!Array.isArray(sources) || sources.length === 0) {
    return errorResponse(
      400,
      "invalid_request",
      "sources must be a non-empty array of URLs",
    );
  }

  if (sources.length > 10) {
    return errorResponse(
      400,
      "invalid_request",
      "sources must contain at most 10 items",
    );
  }

  for (const source of sources) {
    if (typeof source !== "string") {
      return errorResponse(
        400,
        "invalid_request",
        "Each source must be a string URL",
      );
    }
    try {
      new URL(source);
    } catch {
      return errorResponse(
        400,
        "invalid_request",
        `Invalid URL: ${source}`,
      );
    }
  }

  return null;
}
