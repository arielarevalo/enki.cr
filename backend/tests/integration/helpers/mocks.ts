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
  const encoder = new TextEncoder();
  const msgId = "msg_1";
  const fullText = "Hello";
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(
        `event: response.created\ndata: ${JSON.stringify({ type: "response.created", sequence_number: 0, response: { id: "resp_1", object: "response", created_at: 1700000000, status: "in_progress", model: "enki-agent-v1", output: [], usage: null } })}\n\n`
      ));
      controller.enqueue(encoder.encode(
        `event: response.output_item.added\ndata: ${JSON.stringify({ type: "response.output_item.added", sequence_number: 1, output_index: 0, item: { type: "message", id: msgId, status: "in_progress", role: "assistant", content: [] } })}\n\n`
      ));
      controller.enqueue(encoder.encode(
        `event: response.content_part.added\ndata: ${JSON.stringify({ type: "response.content_part.added", sequence_number: 2, item_id: msgId, output_index: 0, content_index: 0, part: { type: "output_text", text: "", annotations: [] } })}\n\n`
      ));
      controller.enqueue(encoder.encode(
        `event: response.output_text.delta\ndata: ${JSON.stringify({ type: "response.output_text.delta", sequence_number: 3, item_id: msgId, output_index: 0, content_index: 0, delta: fullText })}\n\n`
      ));
      controller.enqueue(encoder.encode(
        `event: response.output_text.done\ndata: ${JSON.stringify({ type: "response.output_text.done", sequence_number: 4, item_id: msgId, output_index: 0, content_index: 0, text: fullText })}\n\n`
      ));
      controller.enqueue(encoder.encode(
        `event: response.content_part.done\ndata: ${JSON.stringify({ type: "response.content_part.done", sequence_number: 5, item_id: msgId, output_index: 0, content_index: 0, part: { type: "output_text", text: fullText, annotations: [] } })}\n\n`
      ));
      controller.enqueue(encoder.encode(
        `event: response.output_item.done\ndata: ${JSON.stringify({ type: "response.output_item.done", sequence_number: 6, output_index: 0, item: { type: "message", id: msgId, status: "completed", role: "assistant", content: [{ type: "output_text", text: fullText, annotations: [] }] } })}\n\n`
      ));
      controller.enqueue(encoder.encode(
        `event: response.completed\ndata: ${JSON.stringify({ type: "response.completed", sequence_number: 7, response: { id: "resp_1", object: "response", created_at: 1700000000, status: "completed", model: "enki-agent-v1", output: [{ type: "message", id: msgId, status: "completed", role: "assistant", content: [{ type: "output_text", text: fullText, annotations: [] }] }], usage: null } })}\n\n`
      ));
      controller.close();
    },
  });
}
