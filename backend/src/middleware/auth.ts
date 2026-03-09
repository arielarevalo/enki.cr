import type { ApiKey, DataStore } from "../abstractions/data-store.js";
import { errorResponse } from "../errors.js";

export type KeyType = "admin" | "client";

export interface AuthResult {
  key: ApiKey;
}

export async function authenticate(
  request: Request,
  store: DataStore,
  requiredTypes: KeyType[],
): Promise<AuthResult | Response> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return errorResponse(
      401,
      "unauthorized",
      "Missing or invalid Authorization header",
    );
  }

  const rawKey = authHeader.slice(7);
  const hash = await hashKey(rawKey);
  const key = await store.findKeyByHash(hash);

  if (!key) {
    return errorResponse(401, "unauthorized", "Invalid API key");
  }

  if (!requiredTypes.includes(key.type)) {
    return errorResponse(
      403,
      "forbidden",
      `Key type '${key.type}' insufficient for this endpoint`,
    );
  }

  return { key };
}

export async function hashKey(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
