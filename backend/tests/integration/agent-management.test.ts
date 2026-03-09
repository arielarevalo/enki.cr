import { describe, it, expect, vi } from "vitest";
import { createTestApp } from "./helpers/test-app.js";
import {
  createMockKeyRepository,
  createMockSettingsRepository,
  createMockAgentProvider,
  DEFAULT_AGENTS,
} from "./helpers/mocks.js";
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

  describe("GET /api/admin/agents/active", () => {
    it("returns 200 with current active agent", async () => {
      const adminKey = await adminKeyEntry();
      const settingsRepository = createMockSettingsRepository();
      await settingsRepository.set("active_agent", "outline-deep");
      const app = createTestApp({
        ...createAuthenticatedDeps(adminKey),
        settingsRepository,
      });

      const res = await app.fetch(
        adminRequest("/api/admin/agents/active", { method: "GET" }),
      );

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.active_agent).toBe("outline-deep");
    });

    it("returns 200 with null when no active agent is set", async () => {
      const adminKey = await adminKeyEntry();
      const app = createTestApp(createAuthenticatedDeps(adminKey));

      const res = await app.fetch(
        adminRequest("/api/admin/agents/active", { method: "GET" }),
      );

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.active_agent).toBeNull();
    });
  });

  describe("PUT /api/admin/agents/active", () => {
    it("returns 200 when setting a valid agent_id", async () => {
      const adminKey = await adminKeyEntry();
      const settingsRepository = createMockSettingsRepository();
      const app = createTestApp({
        ...createAuthenticatedDeps(adminKey),
        settingsRepository,
      });

      const res = await app.fetch(
        adminRequest("/api/admin/agents/active", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent_id: "outline-deep" }),
        }),
      );

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.active_agent).toBe("outline-deep");
      expect(settingsRepository.set).toHaveBeenCalledWith(
        "active_agent",
        "outline-deep",
      );
    });

    it("returns 400 when agent_id is unknown", async () => {
      const adminKey = await adminKeyEntry();
      const app = createTestApp(createAuthenticatedDeps(adminKey));

      const res = await app.fetch(
        adminRequest("/api/admin/agents/active", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent_id: "nonexistent-agent" }),
        }),
      );

      expect(res.status).toBe(400);
      const body: any = await res.json();
      expect(body.error.type).toBe("invalid_request");
      expect(body.error.message).toContain("nonexistent-agent");
    });

    it("returns 400 when agent_id field is missing", async () => {
      const adminKey = await adminKeyEntry();
      const app = createTestApp(createAuthenticatedDeps(adminKey));

      const res = await app.fetch(
        adminRequest("/api/admin/agents/active", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
      );

      expect(res.status).toBe(400);
      const body: any = await res.json();
      expect(body.error.type).toBe("invalid_request");
      expect(body.error.message).toContain("agent_id");
    });
  });
});
