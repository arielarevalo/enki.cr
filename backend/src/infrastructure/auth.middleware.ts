import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppEnv } from "../shared/types.js";
import { authenticate, type KeyType } from "./auth.js";

export function requireAuth(...types: KeyType[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const result = await authenticate(c.req.raw, c.get("keyLookup"), types);
    if (result instanceof Response) {
      throw new HTTPException(
        result.status as ContentfulStatusCode,
        { res: result },
      );
    }
    await next();
  });
}
