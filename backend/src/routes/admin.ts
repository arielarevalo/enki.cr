import type { AgentProvider } from "../abstractions/agent-provider.js";
import type { DataStore } from "../abstractions/data-store.js";
import type { Logger } from "../abstractions/logger.js";
import { authenticate, hashKey } from "../middleware/auth.js";
import { errorResponse } from "../errors.js";

export async function handleListAgents(
  request: Request,
  store: DataStore,
  agents: AgentProvider,
  logger: Logger,
): Promise<Response> {
  const auth = await authenticate(request, store, ["admin"]);
  if (auth instanceof Response) return auth;

  logger.info("Listing agents");
  return Response.json({ agents: agents.list() });
}

export async function handleGetActiveAgent(
  request: Request,
  store: DataStore,
  logger: Logger,
): Promise<Response> {
  const auth = await authenticate(request, store, ["admin"]);
  if (auth instanceof Response) return auth;

  const activeAgent = await store.getSetting("active_agent");
  return Response.json({ active_agent: activeAgent });
}

export async function handleSetActiveAgent(
  request: Request,
  store: DataStore,
  agents: AgentProvider,
  logger: Logger,
): Promise<Response> {
  const auth = await authenticate(request, store, ["admin"]);
  if (auth instanceof Response) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_request", "Invalid JSON body");
  }

  if (typeof body !== "object" || body === null) {
    return errorResponse(
      400,
      "invalid_request",
      "Request body must be a JSON object",
    );
  }

  const { agent_id } = body as Record<string, unknown>;
  if (typeof agent_id !== "string") {
    return errorResponse(400, "invalid_request", "agent_id must be a string");
  }

  const available = agents.list();
  if (!available.some((a) => a.id === agent_id)) {
    return errorResponse(
      400,
      "invalid_request",
      `Unknown agent: ${agent_id}`,
    );
  }

  await store.setSetting("active_agent", agent_id);
  logger.info("Active agent updated", { agent_id });

  return Response.json({ active_agent: agent_id });
}

export async function handleCreateKey(
  request: Request,
  store: DataStore,
  logger: Logger,
): Promise<Response> {
  const auth = await authenticate(request, store, ["admin"]);
  if (auth instanceof Response) return auth;

  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const hexStr = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const rawKey = `enki_cli_${hexStr}`;
  const id = crypto.randomUUID();
  const keyHash = await hashKey(rawKey);
  const prefix = "enki_cli_";
  const createdAt = new Date().toISOString();

  await store.createKey({
    id,
    key_hash: keyHash,
    key_prefix: prefix,
    type: "client",
  });

  logger.info("Client key created", { id, prefix });

  return Response.json(
    { id, key: rawKey, type: "client", created_at: createdAt },
    { status: 201 },
  );
}

export async function handleListKeys(
  request: Request,
  store: DataStore,
  logger: Logger,
): Promise<Response> {
  const auth = await authenticate(request, store, ["admin"]);
  if (auth instanceof Response) return auth;

  logger.info("Listing keys");
  const keys = await store.listKeys();

  return Response.json({
    keys: keys.map((k) => ({
      id: k.id,
      prefix: k.key_prefix,
      type: k.type,
      created_at: k.created_at,
      revoked_at: k.revoked_at,
    })),
  });
}

export async function handleRevokeKey(
  request: Request,
  store: DataStore,
  logger: Logger,
  keyId: string,
): Promise<Response> {
  const auth = await authenticate(request, store, ["admin"]);
  if (auth instanceof Response) return auth;

  const key = await store.findKeyById(keyId);
  if (!key) {
    return errorResponse(404, "not_found", "Key not found");
  }
  if (key.revoked_at) {
    return errorResponse(400, "invalid_request", "Key is already revoked");
  }

  await store.revokeKey(keyId);
  logger.info("Key revoked", { id: keyId });

  return Response.json({ id: keyId, revoked: true });
}
