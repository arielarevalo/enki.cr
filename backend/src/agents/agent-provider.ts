import type { AgentInfo, ProcessRequest } from "./agent.types.js";

export interface AgentProvider {
  list(): AgentInfo[];
  invoke(agentId: string, request: ProcessRequest): Promise<ReadableStream>;
}
