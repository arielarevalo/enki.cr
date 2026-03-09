import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { createSubApp } from "../shared/app-factory.js";
import { requireAuth } from "../infrastructure/auth.middleware.js";
import { AgentSchema } from "../shared/schemas.js";

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

const app = createSubApp();
app.use(requireAuth("admin"));

app.openapi(listAgents, async (c) => {
  const agentProvider = c.get("agentProvider");
  c.get("logger").info("Listing agents");
  const agents = await agentProvider.list();
  return c.json({ agents }, 200);
});

export { app as agentRoutes };
