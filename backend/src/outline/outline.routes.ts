import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { createSubApp } from "../shared/app-factory.js";
import { requireAuth } from "../infrastructure/auth.middleware.js";
import { ErrorSchema } from "../shared/schemas.js";
import {
  NoActiveAgentError,
  AgentInvocationError,
} from "./outline.service.js";

const ProcessRequestSchema = z.object({
  sources: z
    .array(z.string())
    .min(1, "sources must be a non-empty array of URLs")
    .max(10, "sources must contain at most 10 items"),
});

const processRoute = createRoute({
  method: "post",
  path: "/process",
  tags: ["Outline"],
  summary: "Process sources into an outline (SSE stream)",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: ProcessRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: "SSE stream (OpenAI Responses API format)",
      content: { "text/event-stream": { schema: z.string() } },
    },
    400: {
      description: "Invalid request",
      content: { "application/json": { schema: ErrorSchema } },
    },
    500: {
      description: "No active agent configured",
      content: { "application/json": { schema: ErrorSchema } },
    },
    502: {
      description: "Agent unreachable",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const app = createSubApp();
app.use(requireAuth("client", "admin"));

app.openapi(processRoute, async (c) => {
  const { sources } = c.req.valid("json");

  for (const source of sources) {
    try {
      new URL(source);
    } catch {
      throw new HTTPException(400, {
        res: Response.json(
          { error: { type: "invalid_request", message: `Invalid URL: ${source}` } },
          { status: 400 },
        ),
      });
    }
  }

  const outlineService = c.get("outlineService");

  try {
    const stream = await outlineService.process(sources);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }) as any;
  } catch (err) {
    if (err instanceof NoActiveAgentError) {
      throw new HTTPException(500, {
        res: Response.json(
          { error: { type: "internal_error", message: err.message } },
          { status: 500 },
        ),
      });
    }
    if (err instanceof AgentInvocationError) {
      throw new HTTPException(502, {
        res: Response.json(
          { error: { type: "agent_error", message: err.message } },
          { status: 502 },
        ),
      });
    }
    throw err;
  }
});

export { app as outlineRoutes };
