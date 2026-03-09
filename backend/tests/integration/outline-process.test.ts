import { describe, it, expect, vi } from "vitest";
import { createTestApp } from "./helpers/test-app.js";
import {
  createMockKeyRepository,
  createMockSettingsRepository,
  createMockAgentProvider,
  createValidSseStream,
} from "./helpers/mocks.js";
import { hashKey } from "../../src/infrastructure/auth.js";
import type { ApiKey } from "../../src/keys/key.types.js";

const TEST_CLIENT_KEY = "enki_cli_testclientkey";
const VALID_SOURCES = ["https://example.com/article1", "https://example.com/article2"];

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

function clientRequest(body: unknown): Request {
  return new Request("https://test.local/api/outline/process", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TEST_CLIENT_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function createAuthenticatedDeps(clientKey: ApiKey) {
  return {
    keyRepository: createMockKeyRepository({
      findByHash: vi.fn(async (hash: string) =>
        hash === clientKey.keyHash ? clientKey : null,
      ),
    }),
  };
}

async function readStream(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}

describe("Outline process", () => {
  describe("POST /api/outline/process", () => {
    it("returns 401 with no auth header", async () => {
      const app = createTestApp();

      const res = await app.fetch(
        new Request("https://test.local/api/outline/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sources: VALID_SOURCES }),
        }),
      );

      expect(res.status).toBe(401);
      const body: any = await res.json();
      expect(body.error.type).toBe("unauthorized");
    });

    it("returns 200 SSE stream with client key", async () => {
      const clientKey = await clientKeyEntry();
      const settingsRepository = createMockSettingsRepository();
      await settingsRepository.set("active_agent", "outline-deep");
      const agentProvider = createMockAgentProvider();
      const app = createTestApp({
        ...createAuthenticatedDeps(clientKey),
        settingsRepository,
        agentProvider,
      });

      const res = await app.fetch(clientRequest({ sources: VALID_SOURCES }));

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/event-stream");
      expect(res.headers.get("Cache-Control")).toBe("no-cache");

      const text = await readStream(res.body!);
      expect(text).toContain("data: ");
      expect(text).toContain("chat.completion.chunk");
    });

    it("returns 400 with invalid JSON body", async () => {
      const clientKey = await clientKeyEntry();
      const app = createTestApp(createAuthenticatedDeps(clientKey));

      const res = await app.fetch(
        new Request("https://test.local/api/outline/process", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${TEST_CLIENT_KEY}`,
            "Content-Type": "application/json",
          },
          body: "not valid json",
        }),
      );

      expect(res.status).toBe(400);
      const body: any = await res.json();
      expect(body.error.type).toBe("invalid_request");
    });

    it("returns 400 with missing sources", async () => {
      const clientKey = await clientKeyEntry();
      const app = createTestApp(createAuthenticatedDeps(clientKey));

      const res = await app.fetch(clientRequest({}));

      expect(res.status).toBe(400);
      const body: any = await res.json();
      expect(body.error.type).toBe("invalid_request");
      expect(body.error.message).toContain("sources");
    });

    it("returns 400 with more than 10 sources", async () => {
      const clientKey = await clientKeyEntry();
      const app = createTestApp(createAuthenticatedDeps(clientKey));
      const sources = Array.from(
        { length: 11 },
        (_, i) => `https://example.com/article${i}`,
      );

      const res = await app.fetch(clientRequest({ sources }));

      expect(res.status).toBe(400);
      const body: any = await res.json();
      expect(body.error.type).toBe("invalid_request");
      expect(body.error.message).toContain("10");
    });

    it("returns 400 with invalid URL", async () => {
      const clientKey = await clientKeyEntry();
      const app = createTestApp(createAuthenticatedDeps(clientKey));

      const res = await app.fetch(
        clientRequest({ sources: ["not-a-url"] }),
      );

      expect(res.status).toBe(400);
      const body: any = await res.json();
      expect(body.error.type).toBe("invalid_request");
      expect(body.error.message).toContain("not-a-url");
    });

    it("returns 500 when no active agent is configured", async () => {
      const clientKey = await clientKeyEntry();
      const settingsRepository = createMockSettingsRepository();
      // No active_agent set
      const app = createTestApp({
        ...createAuthenticatedDeps(clientKey),
        settingsRepository,
      });

      const res = await app.fetch(clientRequest({ sources: VALID_SOURCES }));

      expect(res.status).toBe(500);
      const body: any = await res.json();
      expect(body.error.type).toBe("internal_error");
    });

    it("returns 502 when agent invocation fails", async () => {
      const clientKey = await clientKeyEntry();
      const settingsRepository = createMockSettingsRepository();
      await settingsRepository.set("active_agent", "outline-deep");
      const agentProvider = createMockAgentProvider({
        invoke: vi.fn().mockRejectedValue(new Error("Agent unreachable")),
      });
      const app = createTestApp({
        ...createAuthenticatedDeps(clientKey),
        settingsRepository,
        agentProvider,
      });

      const res = await app.fetch(clientRequest({ sources: VALID_SOURCES }));

      expect(res.status).toBe(502);
      const body: any = await res.json();
      expect(body.error.type).toBe("agent_error");
    });
  });
});
