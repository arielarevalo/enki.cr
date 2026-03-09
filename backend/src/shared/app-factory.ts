import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "./types.js";

export function createSubApp() {
  return new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        const issue = result.error.issues[0];
        const path = issue?.path?.join(".");
        const message = path
          ? `${path}: ${issue.message}`
          : (issue?.message ?? "Validation error");
        return c.json(
          { error: { type: "invalid_request", message } },
          400,
        );
      }
    },
  });
}
