import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { createSubApp } from "../shared/app-factory.js";
import { requireAuth } from "../infrastructure/auth.middleware.js";

const DemoResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

const listDemos = createRoute({
  method: "get",
  path: "/",
  tags: ["Demos"],
  summary: "List available demos",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Demo list",
      content: {
        "application/json": {
          schema: z.object({ demos: z.array(DemoResponseSchema) }),
        },
      },
    },
  },
});

const app = createSubApp();
app.use(requireAuth("client", "admin"));

app.openapi(listDemos, async (c) => {
  const demoService = c.get("demoService");
  const demos = await demoService.listDemos();
  return c.json({
    demos: demos.map((d) => ({ id: d.id, name: d.name, description: d.description })),
  }, 200);
});

export { app as demoRoutes };
