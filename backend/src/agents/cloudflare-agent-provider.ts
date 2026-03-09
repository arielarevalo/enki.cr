import type { AgentInfo, ProcessRequest } from "./agent.types.js";
import type { AgentProvider } from "./agent-provider.js";

function toPathSlug(className: string): string {
  return className
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

export class CloudflareAgentProvider implements AgentProvider {
  private cachedAgents?: AgentInfo[];

  constructor(private agentsBaseUrl: string) {}

  async list(): Promise<AgentInfo[]> {
    if (this.cachedAgents) return this.cachedAgents;

    const response = await fetch(`${this.agentsBaseUrl}/agents/`);
    if (!response.ok) {
      throw new Error(`Failed to fetch agent registry: ${response.status}`);
    }
    const data = (await response.json()) as { agents: AgentInfo[] };
    this.cachedAgents = data.agents;
    return this.cachedAgents;
  }

  async invoke(agentName: string, request: ProcessRequest): Promise<ReadableStream> {
    const pathSlug = toPathSlug(agentName);
    const instanceId = crypto.randomUUID();
    const url = `${this.agentsBaseUrl}/agents/${pathSlug}/${instanceId}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: request.sources.map((s) => ({ type: "input_text", text: s })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Agent returned ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("Agent returned no body");
    }

    return response.body;
  }
}
