import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { createSubApp } from "../shared/app-factory.js";
import { requireAuth } from "../infrastructure/auth.middleware.js";
import { AgentSchema, ErrorSchema } from "../shared/schemas.js";

const listAgents = createRoute({
  method: "get",
  path: "/",
  tags: ["Agents"],
  summary: "List available agents",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Agent list",
      content: {
        "application/json": {
          schema: z.object({ agents: z.array(AgentSchema) }),
        },
      },
    },
  },
});

const getActiveAgent = createRoute({
  method: "get",
  path: "/active",
  tags: ["Agents"],
  summary: "Get active agent",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Active agent",
      content: {
        "application/json": {
          schema: z.object({ active_agent: z.string().nullable() }),
        },
      },
    },
  },
});

const SetActiveAgentSchema = z.object({
  agent_id: z.string(),
});

const setActiveAgent = createRoute({
  method: "put",
  path: "/active",
  tags: ["Agents"],
  summary: "Set active agent",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: SetActiveAgentSchema },
      },
    },
  },
  responses: {
    200: {
      description: "Updated",
      content: {
        "application/json": {
          schema: z.object({ active_agent: z.string() }),
        },
      },
    },
    400: {
      description: "Invalid request",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const app = createSubApp();
app.use(requireAuth("admin"));

app.openapi(listAgents, (c) => {
  const agentProvider = c.get("agentProvider");
  c.get("logger").info("Listing agents");
  return c.json({ agents: agentProvider.list() }, 200);
});

app.openapi(getActiveAgent, async (c) => {
  const settingsRepository = c.get("settingsRepository");
  const activeAgent = await settingsRepository.get("active_agent");
  return c.json({ active_agent: activeAgent }, 200);
});

app.openapi(setActiveAgent, async (c) => {
  const { agent_id } = c.req.valid("json");
  const agentProvider = c.get("agentProvider");
  const settingsRepository = c.get("settingsRepository");

  const available = agentProvider.list();
  if (!available.some((a) => a.id === agent_id)) {
    throw new HTTPException(400, {
      res: Response.json(
        { error: { type: "invalid_request", message: `Unknown agent: ${agent_id}` } },
        { status: 400 },
      ),
    });
  }

  await settingsRepository.set("active_agent", agent_id);
  c.get("logger").info("Active agent updated", { agent_id });
  return c.json({ active_agent: agent_id }, 200);
});

export { app as agentRoutes };
