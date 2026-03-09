import { vi } from "vitest";
import type { KeyRepository } from "../../../src/keys/key-repository.js";
import type { DemoRepository } from "../../../src/demos/demo-repository.js";
import type { AgentProvider } from "../../../src/agents/agent-provider.js";
import type { Logger } from "../../../src/infrastructure/logger.js";
import type { AgentInfo } from "../../../src/agents/agent.types.js";
import type { Demo } from "../../../src/demos/demo.types.js";

export const DEFAULT_AGENTS: AgentInfo[] = [
  { name: "OutlineDeepAgent", description: "Deep analysis agent" },
  { name: "OutlineReactAgent", description: "ReAct reasoning agent" },
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

export function createMockDemoRepository(
  overrides?: Partial<DemoRepository>,
): DemoRepository {
  const demos = new Map<string, Demo>();
  const agentAssignments = new Map<string, string>(); // agentName -> demoId

  return {
    list: vi.fn(async () => Array.from(demos.values())),
    findById: vi.fn(async (id: string) => demos.get(id) ?? null),
    create: vi.fn(async (demo: Omit<Demo, "createdAt">) => {
      demos.set(demo.id, { ...demo, createdAt: new Date().toISOString() });
    }),
    update: vi.fn(async (id: string, fields: { name?: string; description?: string }) => {
      const demo = demos.get(id);
      if (demo) demos.set(id, { ...demo, ...fields });
    }),
    remove: vi.fn(async (id: string) => {
      demos.delete(id);
      for (const [agent, dId] of agentAssignments) {
        if (dId === id) agentAssignments.delete(agent);
      }
    }),
    setActiveAgent: vi.fn(async (demoId: string, agentName: string | null) => {
      const demo = demos.get(demoId);
      if (demo) demos.set(demoId, { ...demo, activeAgent: agentName });
    }),
    getActiveAgent: vi.fn(async (demoId: string) => {
      return demos.get(demoId)?.activeAgent ?? null;
    }),
    assignAgent: vi.fn(async (demoId: string, agentName: string) => {
      agentAssignments.set(agentName, demoId);
    }),
    unassignAgent: vi.fn(async (agentName: string) => {
      agentAssignments.delete(agentName);
    }),
    getAgentNames: vi.fn(async (demoId: string) => {
      const names: string[] = [];
      for (const [agent, dId] of agentAssignments) {
        if (dId === demoId) names.push(agent);
      }
      return names;
    }),
    getDemoForAgent: vi.fn(async (agentName: string) => {
      return agentAssignments.get(agentName) ?? null;
    }),
    ...overrides,
  };
}

export function createMockAgentProvider(
  overrides?: Partial<AgentProvider>,
): AgentProvider {
  return {
    list: vi.fn().mockResolvedValue(DEFAULT_AGENTS),
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
