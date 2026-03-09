import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { createSubApp } from "../shared/app-factory.js";
import { requireAuth } from "../infrastructure/auth.middleware.js";
import { ErrorSchema } from "../shared/schemas.js";

const checkAuth = createRoute({
  method: "post",
  path: "/check",
  tags: ["Auth"],
  summary: "Validate API key",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Key is valid",
      content: {
        "application/json": {
          schema: z.object({ valid: z.boolean() }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": { schema: ErrorSchema },
      },
    },
  },
});

const app = createSubApp();
app.use(requireAuth("client", "admin"));
app.openapi(checkAuth, (c) => c.json({ valid: true }, 200));

export { app as authRoutes };
