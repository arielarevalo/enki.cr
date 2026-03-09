import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { createSubApp } from "../shared/app-factory.js";
import { requireAuth } from "../infrastructure/auth.middleware.js";
import { ErrorSchema, ApiKeyResponseSchema } from "../shared/schemas.js";
import { NotFoundError, ValidationError } from "../shared/errors.js";

const createKey = createRoute({
  method: "post",
  path: "/",
  tags: ["Keys"],
  summary: "Create a client API key",
  security: [{ bearerAuth: [] }],
  responses: {
    201: {
      description: "Key created (raw key only shown once)",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            key: z.string(),
            type: z.string(),
            created_at: z.string(),
          }),
        },
      },
    },
  },
});

const listKeys = createRoute({
  method: "get",
  path: "/",
  tags: ["Keys"],
  summary: "List API keys",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Key list",
      content: {
        "application/json": {
          schema: z.object({ keys: z.array(ApiKeyResponseSchema) }),
        },
      },
    },
  },
});

const revokeKey = createRoute({
  method: "delete",
  path: "/{keyId}",
  tags: ["Keys"],
  summary: "Revoke an API key",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ keyId: z.string() }),
  },
  responses: {
    200: {
      description: "Key revoked",
      content: {
        "application/json": {
          schema: z.object({ id: z.string(), revoked: z.boolean() }),
        },
      },
    },
    400: {
      description: "Already revoked",
      content: { "application/json": { schema: ErrorSchema } },
    },
    404: {
      description: "Key not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const app = createSubApp();
app.use(requireAuth("admin"));

app.openapi(createKey, async (c) => {
  const keyService = c.get("keyService");
  const created = await keyService.create();
  c.get("logger").info("Client key created", { id: created.id });
  return c.json(
    {
      id: created.id,
      key: created.rawKey,
      type: created.type,
      created_at: created.createdAt,
    },
    201,
  );
});

app.openapi(listKeys, async (c) => {
  c.get("logger").info("Listing keys");
  const keyService = c.get("keyService");
  const keys = await keyService.list();
  return c.json(
    {
      keys: keys.map((k) => ({
        id: k.id,
        prefix: k.keyPrefix,
        type: k.type,
        created_at: k.createdAt,
        revoked_at: k.revokedAt,
      })),
    },
    200,
  );
});

app.openapi(revokeKey, async (c) => {
  const { keyId } = c.req.valid("param");
  const keyService = c.get("keyService");

  try {
    await keyService.revoke(keyId);
  } catch (err) {
    if (err instanceof NotFoundError) {
      throw new HTTPException(404, {
        res: Response.json(
          { error: { type: "not_found", message: err.message } },
          { status: 404 },
        ),
      });
    }
    if (err instanceof ValidationError) {
      throw new HTTPException(400, {
        res: Response.json(
          { error: { type: "invalid_request", message: err.message } },
          { status: 400 },
        ),
      });
    }
    throw err;
  }

  c.get("logger").info("Key revoked", { id: keyId });
  return c.json({ id: keyId, revoked: true }, 200);
});

export { app as keyRoutes };
