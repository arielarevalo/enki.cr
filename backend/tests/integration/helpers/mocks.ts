import { vi } from "vitest";
import type { KeyRepository } from "../../../src/keys/key-repository.js";
import type { SettingsRepository } from "../../../src/infrastructure/settings.repository.js";
import type { AgentProvider } from "../../../src/agents/agent-provider.js";
import type { Logger } from "../../../src/infrastructure/logger.js";
import type { AgentInfo } from "../../../src/agents/agent.types.js";

export const DEFAULT_AGENTS: AgentInfo[] = [
  {
    id: "outline-deep",
    name: "Outline Deep",
    description: "Deep analysis agent",
  },
  {
    id: "outline-react",
    name: "Outline React",
    description: "ReAct reasoning agent",
  },
];

export function createMockKeyRepository(
  overrides?: Partial<KeyRepository>,
): KeyRepository {
  return {
    findByHash: vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
    revoke: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function createMockSettingsRepository(
  overrides?: Partial<SettingsRepository>,
): SettingsRepository {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    ...overrides,
  };
}

export function createMockAgentProvider(
  overrides?: Partial<AgentProvider>,
): AgentProvider {
  return {
    list: vi.fn().mockReturnValue(DEFAULT_AGENTS),
    invoke: vi.fn().mockResolvedValue(createValidSseStream()),
    ...overrides,
  };
}

export function createMockLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

export function createValidSseStream(): ReadableStream {
  const chunk = {
    id: "chatcmpl-1",
    object: "chat.completion.chunk",
    created: 1700000000,
    choices: [{ index: 0, delta: { content: "Hello" } }],
  };
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}
