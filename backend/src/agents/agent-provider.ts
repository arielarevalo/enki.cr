import type { AgentInfo, ProcessRequest } from "./agent.types.js";

export interface AgentProvider {
  list(): Promise<AgentInfo[]>;
  invoke(agentName: string, request: ProcessRequest): Promise<ReadableStream>;
}
