import { authenticate } from "../infrastructure/auth.js";
import type { KeyLookup } from "../infrastructure/auth.js";
import type { Logger } from "../infrastructure/logger.js";
import {
  errorResponse,
  NotFoundError,
  ValidationError,
} from "../shared/errors.js";
import type { KeyService } from "./key.service.js";

export async function handleCreateKey(
  request: Request,
  keyLookup: KeyLookup,
  keyService: KeyService,
  logger: Logger,
): Promise<Response> {
  const auth = await authenticate(request, keyLookup, ["admin"]);
  if (auth instanceof Response) return auth;

  const created = await keyService.create();
  logger.info("Client key created", { id: created.id });

  return Response.json(
    {
      id: created.id,
      key: created.rawKey,
      type: created.type,
      created_at: created.createdAt,
    },
    { status: 201 },
  );
}

export async function handleListKeys(
  request: Request,
  keyLookup: KeyLookup,
  keyService: KeyService,
  logger: Logger,
): Promise<Response> {
  const auth = await authenticate(request, keyLookup, ["admin"]);
  if (auth instanceof Response) return auth;

  logger.info("Listing keys");
  const keys = await keyService.list();

  return Response.json({
    keys: keys.map((k) => ({
      id: k.id,
      prefix: k.keyPrefix,
      type: k.type,
      created_at: k.createdAt,
      revoked_at: k.revokedAt,
    })),
  });
}

export async function handleRevokeKey(
  request: Request,
  keyLookup: KeyLookup,
  keyService: KeyService,
  logger: Logger,
  keyId: string,
): Promise<Response> {
  const auth = await authenticate(request, keyLookup, ["admin"]);
  if (auth instanceof Response) return auth;

  try {
    await keyService.revoke(keyId);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return errorResponse(404, "not_found", err.message);
    }
    if (err instanceof ValidationError) {
      return errorResponse(400, "invalid_request", err.message);
    }
    throw err;
  }

  logger.info("Key revoked", { id: keyId });
  return Response.json({ id: keyId, revoked: true });
}
