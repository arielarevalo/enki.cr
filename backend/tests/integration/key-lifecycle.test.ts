import { describe, it, expect, vi } from "vitest";
import { createTestApp } from "./helpers/test-app.js";
import { createMockKeyRepository } from "./helpers/mocks.js";
import { hashKey } from "../../src/infrastructure/auth.js";
import type { ApiKey } from "../../src/keys/key.types.js";

const TEST_ADMIN_KEY = "enki_admin_testkey123";
const TEST_CLIENT_KEY = "enki_cli_testclientkey";

async function adminKeyEntry(): Promise<ApiKey> {
  return {
    id: "admin-key-id",
    keyHash: await hashKey(TEST_ADMIN_KEY),
    keyPrefix: "enki_admin_",
    type: "admin",
    createdAt: "2024-01-01T00:00:00.000Z",
    revokedAt: null,
  };
}

async function clientKeyEntry(): Promise<ApiKey> {
  return {
    id: "client-key-id",
    keyHash: await hashKey(TEST_CLIENT_KEY),
    keyPrefix: "enki_cli_",
    type: "client",
    createdAt: "2024-01-01T00:00:00.000Z",
    revokedAt: null,
  };
}

function adminRequest(
  path: string,
  options?: RequestInit,
): Request {
  return new Request(`https://test.local${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TEST_ADMIN_KEY}`,
      ...options?.headers,
    },
  });
}

describe("Key lifecycle", () => {
  describe("POST /api/admin/keys", () => {
    it("returns 401 with no auth header", async () => {
      const app = createTestApp();
      const res = await app.fetch(
        new Request("https://test.local/api/admin/keys", { method: "POST" }),
      );

      expect(res.status).toBe(401);
      const body: any = await res.json();
      expect(body.error.type).toBe("unauthorized");
    });

    it("returns 403 with client key", async () => {
      const clientKey = await clientKeyEntry();
      const keyRepository = createMockKeyRepository({
        findByHash: vi.fn(async (hash: string) =>
          hash === clientKey.keyHash ? clientKey : null,
        ),
      });
      const app = createTestApp({ keyRepository });

      const res = await app.fetch(
        new Request("https://test.local/api/admin/keys", {
          method: "POST",
          headers: { Authorization: `Bearer ${TEST_CLIENT_KEY}` },
        }),
      );

      expect(res.status).toBe(403);
      const body: any = await res.json();
      expect(body.error.type).toBe("forbidden");
    });

    it("returns 201 with admin key and raw key in response", async () => {
      const adminKey = await adminKeyEntry();
      const keyRepository = createMockKeyRepository({
        findByHash: vi.fn(async (hash: string) =>
          hash === adminKey.keyHash ? adminKey : null,
        ),
      });
      const app = createTestApp({ keyRepository });

      const res = await app.fetch(
        adminRequest("/api/admin/keys", { method: "POST" }),
      );

      expect(res.status).toBe(201);
      const body: any = await res.json();
      expect(body.key).toMatch(/^enki_cli_/);
      expect(body.id).toBeDefined();
      expect(body.type).toBe("client");
      expect(body.created_at).toBeDefined();
    });
  });

  describe("GET /api/admin/keys", () => {
    it("returns 200 with key list", async () => {
      const adminKey = await adminKeyEntry();
      const storedKeys: ApiKey[] = [
        {
          id: "key-1",
          keyHash: "hash1",
          keyPrefix: "enki_cli_",
          type: "client",
          createdAt: "2024-01-01T00:00:00.000Z",
          revokedAt: null,
        },
      ];
      const keyRepository = createMockKeyRepository({
        findByHash: vi.fn(async (hash: string) =>
          hash === adminKey.keyHash ? adminKey : null,
        ),
        list: vi.fn().mockResolvedValue(storedKeys),
      });
      const app = createTestApp({ keyRepository });

      const res = await app.fetch(
        adminRequest("/api/admin/keys", { method: "GET" }),
      );

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.keys).toHaveLength(1);
      expect(body.keys[0].id).toBe("key-1");
      expect(body.keys[0].prefix).toBe("enki_cli_");
      expect(body.keys[0].type).toBe("client");
      expect(body.keys[0].created_at).toBe("2024-01-01T00:00:00.000Z");
      expect(body.keys[0].revoked_at).toBeNull();
    });
  });

  describe("DELETE /api/admin/keys/:id", () => {
    it("returns 200 when key exists and is active", async () => {
      const adminKey = await adminKeyEntry();
      const targetKey: ApiKey = {
        id: "key-to-revoke",
        keyHash: "somehash",
        keyPrefix: "enki_cli_",
        type: "client",
        createdAt: "2024-01-01T00:00:00.000Z",
        revokedAt: null,
      };
      const keyRepository = createMockKeyRepository({
        findByHash: vi.fn(async (hash: string) =>
          hash === adminKey.keyHash ? adminKey : null,
        ),
        findById: vi.fn(async (id: string) =>
          id === "key-to-revoke" ? targetKey : null,
        ),
      });
      const app = createTestApp({ keyRepository });

      const res = await app.fetch(
        adminRequest("/api/admin/keys/key-to-revoke", { method: "DELETE" }),
      );

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.id).toBe("key-to-revoke");
      expect(body.revoked).toBe(true);
      expect(keyRepository.revoke).toHaveBeenCalledWith("key-to-revoke");
    });

    it("returns 404 when key does not exist", async () => {
      const adminKey = await adminKeyEntry();
      const keyRepository = createMockKeyRepository({
        findByHash: vi.fn(async (hash: string) =>
          hash === adminKey.keyHash ? adminKey : null,
        ),
        findById: vi.fn().mockResolvedValue(null),
      });
      const app = createTestApp({ keyRepository });

      const res = await app.fetch(
        adminRequest("/api/admin/keys/nonexistent", { method: "DELETE" }),
      );

      expect(res.status).toBe(404);
      const body: any = await res.json();
      expect(body.error.type).toBe("not_found");
    });

    it("returns 400 when key is already revoked", async () => {
      const adminKey = await adminKeyEntry();
      const revokedKey: ApiKey = {
        id: "revoked-key",
        keyHash: "somehash",
        keyPrefix: "enki_cli_",
        type: "client",
        createdAt: "2024-01-01T00:00:00.000Z",
        revokedAt: "2024-06-01T00:00:00.000Z",
      };
      const keyRepository = createMockKeyRepository({
        findByHash: vi.fn(async (hash: string) =>
          hash === adminKey.keyHash ? adminKey : null,
        ),
        findById: vi.fn(async (id: string) =>
          id === "revoked-key" ? revokedKey : null,
        ),
      });
      const app = createTestApp({ keyRepository });

      const res = await app.fetch(
        adminRequest("/api/admin/keys/revoked-key", { method: "DELETE" }),
      );

      expect(res.status).toBe(400);
      const body: any = await res.json();
      expect(body.error.type).toBe("invalid_request");
    });
  });
});
