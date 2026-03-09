export interface AgentInfo {
  id: string;
  name: string;
  description: string;
}

export interface ProcessRequest {
  sources: string[];
}

export interface AgentProvider {
  /** List all agents available in the registry */
  list(): AgentInfo[];

  /** Invoke an agent, returning an OpenAI-compatible SSE ReadableStream */
  invoke(agentId: string, request: ProcessRequest): Promise<ReadableStream>;
}
