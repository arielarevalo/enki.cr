import { describe, it, expect, vi } from "vitest";
import { createTestApp } from "./helpers/test-app.js";
import { createMockKeyRepository, DEFAULT_AGENTS } from "./helpers/mocks.js";
import { hashKey } from "../../src/infrastructure/auth.js";
import type { ApiKey } from "../../src/keys/key.types.js";

const TEST_ADMIN_KEY = "enki_admin_testkey123";

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

function adminRequest(path: string, options?: RequestInit): Request {
  return new Request(`https://test.local${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TEST_ADMIN_KEY}`,
      ...options?.headers,
    },
  });
}

function createAuthenticatedDeps(adminKey: ApiKey) {
  return {
    keyRepository: createMockKeyRepository({
      findByHash: vi.fn(async (hash: string) =>
        hash === adminKey.keyHash ? adminKey : null,
      ),
    }),
  };
}

describe("Agent management", () => {
  describe("GET /api/admin/agents", () => {
    it("returns 200 with agent list", async () => {
      const adminKey = await adminKeyEntry();
      const app = createTestApp(createAuthenticatedDeps(adminKey));

      const res = await app.fetch(
        adminRequest("/api/admin/agents", { method: "GET" }),
      );

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.agents).toEqual(DEFAULT_AGENTS);
    });
  });
});
