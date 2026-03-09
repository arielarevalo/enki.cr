import { authenticate } from "../infrastructure/auth.js";
import type { KeyLookup } from "../infrastructure/auth.js";
import { errorResponse } from "../shared/errors.js";
import {
  NoActiveAgentError,
  AgentInvocationError,
} from "./outline.service.js";
import type { OutlineService } from "./outline.service.js";

export async function handleOutlineProcess(
  request: Request,
  keyLookup: KeyLookup,
  outlineService: OutlineService,
): Promise<Response> {
  const auth = await authenticate(request, keyLookup, ["client", "admin"]);
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

  try {
    const validated = await outlineService.process(sources);
    return new Response(validated, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    if (err instanceof NoActiveAgentError) {
      return errorResponse(500, "internal_error", err.message);
    }
    if (err instanceof AgentInvocationError) {
      return errorResponse(502, "agent_error", err.message);
    }
    throw err;
  }
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
