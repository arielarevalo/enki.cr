import { describe, it, expect, vi } from "vitest";
import { createTestApp } from "./helpers/test-app.js";
import {
  createMockKeyRepository,
  createMockDemoRepository,
  createMockAgentProvider,
  DEFAULT_AGENTS,
} from "./helpers/mocks.js";
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

function adminRequest(path: string, options?: RequestInit): Request {
  return new Request(`https://test.local${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TEST_ADMIN_KEY}`,
      ...options?.headers,
    },
  });
}

function clientRequest(path: string, options?: RequestInit): Request {
  return new Request(`https://test.local${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TEST_CLIENT_KEY}`,
      ...options?.headers,
    },
  });
}

function createAdminDeps(adminKey: ApiKey) {
  return {
    keyRepository: createMockKeyRepository({
      findByHash: vi.fn(async (hash: string) =>
        hash === adminKey.keyHash ? adminKey : null,
      ),
    }),
  };
}

function createMultiKeyDeps(adminKey: ApiKey, clientKey: ApiKey) {
  return {
    keyRepository: createMockKeyRepository({
      findByHash: vi.fn(async (hash: string) => {
        if (hash === adminKey.keyHash) return adminKey;
        if (hash === clientKey.keyHash) return clientKey;
        return null;
      }),
    }),
  };
}

describe("Demo routes", () => {
  describe("Client: GET /api/demos", () => {
    it("returns 401 with no auth header", async () => {
      const app = createTestApp();
      const res = await app.fetch(
        new Request("https://test.local/api/demos", { method: "GET" }),
      );
      expect(res.status).toBe(401);
    });

    it("returns 200 with empty list", async () => {
      const clientKey = await clientKeyEntry();
      const adminKey = await adminKeyEntry();
      const app = createTestApp(createMultiKeyDeps(adminKey, clientKey));

      const res = await app.fetch(
        clientRequest("/api/demos", { method: "GET" }),
      );

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.demos).toEqual([]);
    });

    it("returns 200 with demo list (client-facing shape)", async () => {
      const clientKey = await clientKeyEntry();
      const adminKey = await adminKeyEntry();
      const demoRepository = createMockDemoRepository();
      await demoRepository.create({ id: "outline", name: "Outline", description: "Test demo", activeAgent: "SomeAgent" });

      const app = createTestApp({
        ...createMultiKeyDeps(adminKey, clientKey),
        demoRepository,
      });

      const res = await app.fetch(
        clientRequest("/api/demos", { method: "GET" }),
      );

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.demos).toHaveLength(1);
      expect(body.demos[0]).toEqual({
        id: "outline",
        name: "Outline",
        description: "Test demo",
      });
      // Should not expose activeAgent or createdAt
      expect(body.demos[0].activeAgent).toBeUndefined();
      expect(body.demos[0].createdAt).toBeUndefined();
    });
  });

  describe("Admin: POST /api/admin/demos", () => {
    it("creates a demo and returns 201", async () => {
      const adminKey = await adminKeyEntry();
      const demoRepository = createMockDemoRepository();
      const app = createTestApp({
        ...createAdminDeps(adminKey),
        demoRepository,
      });

      const res = await app.fetch(
        adminRequest("/api/admin/demos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: "test-demo", name: "Test", description: "A test demo" }),
        }),
      );

      expect(res.status).toBe(201);
      const body: any = await res.json();
      expect(body.id).toBe("test-demo");
      expect(demoRepository.create).toHaveBeenCalled();
    });
  });

  describe("Admin: GET /api/admin/demos", () => {
    it("returns 200 with full demo details", async () => {
      const adminKey = await adminKeyEntry();
      const demoRepository = createMockDemoRepository();
      await demoRepository.create({ id: "outline", name: "Outline", description: "Test", activeAgent: null });
      await demoRepository.assignAgent("outline", "OutlineDeepAgent");

      const app = createTestApp({
        ...createAdminDeps(adminKey),
        demoRepository,
      });

      const res = await app.fetch(
        adminRequest("/api/admin/demos", { method: "GET" }),
      );

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.demos).toHaveLength(1);
      expect(body.demos[0].id).toBe("outline");
      expect(body.demos[0].activeAgent).toBeNull();
      expect(body.demos[0].agentNames).toEqual(["OutlineDeepAgent"]);
    });
  });

  describe("Admin: GET /api/admin/demos/:demoId", () => {
    it("returns 200 with demo details", async () => {
      const adminKey = await adminKeyEntry();
      const demoRepository = createMockDemoRepository();
      await demoRepository.create({ id: "outline", name: "Outline", description: "Test", activeAgent: null });

      const app = createTestApp({
        ...createAdminDeps(adminKey),
        demoRepository,
      });

      const res = await app.fetch(
        adminRequest("/api/admin/demos/outline", { method: "GET" }),
      );

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.id).toBe("outline");
      expect(body.name).toBe("Outline");
    });

    it("returns 404 for non-existent demo", async () => {
      const adminKey = await adminKeyEntry();
      const app = createTestApp(createAdminDeps(adminKey));

      const res = await app.fetch(
        adminRequest("/api/admin/demos/nonexistent", { method: "GET" }),
      );

      expect(res.status).toBe(404);
      const body: any = await res.json();
      expect(body.error.type).toBe("not_found");
    });
  });

  describe("Admin: PUT /api/admin/demos/:demoId", () => {
    it("returns 200 when updating a demo", async () => {
      const adminKey = await adminKeyEntry();
      const demoRepository = createMockDemoRepository();
      await demoRepository.create({ id: "outline", name: "Outline", description: "Old", activeAgent: null });

      const app = createTestApp({
        ...createAdminDeps(adminKey),
        demoRepository,
      });

      const res = await app.fetch(
        adminRequest("/api/admin/demos/outline", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Updated Outline", description: "New" }),
        }),
      );

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.ok).toBe(true);
    });

    it("returns 404 for non-existent demo", async () => {
      const adminKey = await adminKeyEntry();
      const app = createTestApp(createAdminDeps(adminKey));

      const res = await app.fetch(
        adminRequest("/api/admin/demos/nonexistent", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "X" }),
        }),
      );

      expect(res.status).toBe(404);
    });
  });

  describe("Admin: DELETE /api/admin/demos/:demoId", () => {
    it("returns 200 when deleting a demo", async () => {
      const adminKey = await adminKeyEntry();
      const demoRepository = createMockDemoRepository();
      await demoRepository.create({ id: "outline", name: "Outline", description: "Test", activeAgent: null });

      const app = createTestApp({
        ...createAdminDeps(adminKey),
        demoRepository,
      });

      const res = await app.fetch(
        adminRequest("/api/admin/demos/outline", { method: "DELETE" }),
      );

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.ok).toBe(true);
    });

    it("returns 404 for non-existent demo", async () => {
      const adminKey = await adminKeyEntry();
      const app = createTestApp(createAdminDeps(adminKey));

      const res = await app.fetch(
        adminRequest("/api/admin/demos/nonexistent", { method: "DELETE" }),
      );

      expect(res.status).toBe(404);
    });
  });

  describe("Admin: POST /api/admin/demos/:demoId/agents (assign)", () => {
    it("returns 200 when assigning a valid agent", async () => {
      const adminKey = await adminKeyEntry();
      const demoRepository = createMockDemoRepository();
      await demoRepository.create({ id: "outline", name: "Outline", description: "Test", activeAgent: null });

      const app = createTestApp({
        ...createAdminDeps(adminKey),
        demoRepository,
      });

      const res = await app.fetch(
        adminRequest("/api/admin/demos/outline/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent_name: "OutlineDeepAgent" }),
        }),
      );

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.ok).toBe(true);
    });

    it("returns 400 when agent does not exist", async () => {
      const adminKey = await adminKeyEntry();
      const demoRepository = createMockDemoRepository();
      await demoRepository.create({ id: "outline", name: "Outline", description: "Test", activeAgent: null });

      const app = createTestApp({
        ...createAdminDeps(adminKey),
        demoRepository,
      });

      const res = await app.fetch(
        adminRequest("/api/admin/demos/outline/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent_name: "NonexistentAgent" }),
        }),
      );

      expect(res.status).toBe(400);
      const body: any = await res.json();
      expect(body.error.type).toBe("invalid_request");
    });

    it("returns 404 when demo does not exist", async () => {
      const adminKey = await adminKeyEntry();
      const app = createTestApp(createAdminDeps(adminKey));

      const res = await app.fetch(
        adminRequest("/api/admin/demos/nonexistent/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent_name: "OutlineDeepAgent" }),
        }),
      );

      expect(res.status).toBe(404);
    });
  });

  describe("Admin: DELETE /api/admin/demos/:demoId/agents/:agentName (unassign)", () => {
    it("returns 200 when unassigning an agent", async () => {
      const adminKey = await adminKeyEntry();
      const demoRepository = createMockDemoRepository();
      await demoRepository.create({ id: "outline", name: "Outline", description: "Test", activeAgent: null });
      await demoRepository.assignAgent("outline", "OutlineDeepAgent");

      const app = createTestApp({
        ...createAdminDeps(adminKey),
        demoRepository,
      });

      const res = await app.fetch(
        adminRequest("/api/admin/demos/outline/agents/OutlineDeepAgent", { method: "DELETE" }),
      );

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.ok).toBe(true);
    });

    it("returns 404 when demo does not exist", async () => {
      const adminKey = await adminKeyEntry();
      const app = createTestApp(createAdminDeps(adminKey));

      const res = await app.fetch(
        adminRequest("/api/admin/demos/nonexistent/agents/SomeAgent", { method: "DELETE" }),
      );

      expect(res.status).toBe(404);
    });
  });

  describe("Admin: PUT /api/admin/demos/:demoId/active-agent", () => {
    it("returns 200 when setting active agent", async () => {
      const adminKey = await adminKeyEntry();
      const demoRepository = createMockDemoRepository();
      await demoRepository.create({ id: "outline", name: "Outline", description: "Test", activeAgent: null });
      await demoRepository.assignAgent("outline", "OutlineDeepAgent");

      const app = createTestApp({
        ...createAdminDeps(adminKey),
        demoRepository,
      });

      const res = await app.fetch(
        adminRequest("/api/admin/demos/outline/active-agent", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent_name: "OutlineDeepAgent" }),
        }),
      );

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.active_agent).toBe("OutlineDeepAgent");
    });

    it("returns 400 when agent is not assigned to demo", async () => {
      const adminKey = await adminKeyEntry();
      const demoRepository = createMockDemoRepository();
      await demoRepository.create({ id: "outline", name: "Outline", description: "Test", activeAgent: null });

      const app = createTestApp({
        ...createAdminDeps(adminKey),
        demoRepository,
      });

      const res = await app.fetch(
        adminRequest("/api/admin/demos/outline/active-agent", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent_name: "OutlineDeepAgent" }),
        }),
      );

      expect(res.status).toBe(400);
      const body: any = await res.json();
      expect(body.error.type).toBe("invalid_request");
    });

    it("returns 404 when demo does not exist", async () => {
      const adminKey = await adminKeyEntry();
      const app = createTestApp(createAdminDeps(adminKey));

      const res = await app.fetch(
        adminRequest("/api/admin/demos/nonexistent/active-agent", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent_name: "OutlineDeepAgent" }),
        }),
      );

      expect(res.status).toBe(404);
    });
  });

  describe("Admin: GET /api/admin/demos/:demoId/active-agent", () => {
    it("returns 200 with active agent", async () => {
      const adminKey = await adminKeyEntry();
      const demoRepository = createMockDemoRepository();
      await demoRepository.create({ id: "outline", name: "Outline", description: "Test", activeAgent: "OutlineDeepAgent" });

      const app = createTestApp({
        ...createAdminDeps(adminKey),
        demoRepository,
      });

      const res = await app.fetch(
        adminRequest("/api/admin/demos/outline/active-agent", { method: "GET" }),
      );

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.active_agent).toBe("OutlineDeepAgent");
    });

    it("returns 200 with null when no active agent", async () => {
      const adminKey = await adminKeyEntry();
      const demoRepository = createMockDemoRepository();
      await demoRepository.create({ id: "outline", name: "Outline", description: "Test", activeAgent: null });

      const app = createTestApp({
        ...createAdminDeps(adminKey),
        demoRepository,
      });

      const res = await app.fetch(
        adminRequest("/api/admin/demos/outline/active-agent", { method: "GET" }),
      );

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.active_agent).toBeNull();
    });

    it("returns 404 when demo does not exist", async () => {
      const adminKey = await adminKeyEntry();
      const app = createTestApp(createAdminDeps(adminKey));

      const res = await app.fetch(
        adminRequest("/api/admin/demos/nonexistent/active-agent", { method: "GET" }),
      );

      expect(res.status).toBe(404);
    });
  });
});
