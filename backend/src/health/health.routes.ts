import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { createSubApp } from "../shared/app-factory.js";

const healthCheck = createRoute({
  method: "get",
  path: "/",
  tags: ["Health"],
  summary: "Health check",
  responses: {
    200: {
      description: "OK",
      content: {
        "application/json": {
          schema: z.object({ status: z.string() }),
        },
      },
    },
  },
});

const app = createSubApp();
app.openapi(healthCheck, (c) => c.json({ status: "ok" }));

export { app as healthRoutes };
