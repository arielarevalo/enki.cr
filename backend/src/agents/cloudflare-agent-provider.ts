import type { AgentInfo, ProcessRequest } from "./agent.types.js";
import type { AgentProvider } from "./agent-provider.js";

const AGENT_REGISTRY: AgentInfo[] = [
  {
    id: "outline-deep",
    name: "OutlineDeepAgent",
    description: "Deep analysis/generation",
  },
  {
    id: "outline-react",
    name: "OutlineReactAgent",
    description: "ReAct-style reasoning",
  },
  {
    id: "outline-wf",
    name: "OutlineWorkflowAgent",
    description: "Multi-step workflow orchestration",
  },
];

const AGENT_PATH_MAP: Record<string, string> = {
  "outline-deep": "outline-deep-agent",
  "outline-react": "outline-react-agent",
  "outline-wf": "outline-workflow-agent",
};

export class CloudflareAgentProvider implements AgentProvider {
  constructor(private agentsBaseUrl: string) {}

  list(): AgentInfo[] {
    return AGENT_REGISTRY;
  }

  async invoke(
    agentId: string,
    request: ProcessRequest,
  ): Promise<ReadableStream> {
    const pathSlug = AGENT_PATH_MAP[agentId];
    if (!pathSlug) {
      throw new Error(`Unknown agent: ${agentId}`);
    }

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
      throw new Error(
        `Agent returned ${response.status}: ${response.statusText}`,
      );
    }

    if (!response.body) {
      throw new Error("Agent returned no body");
    }

    return response.body;
  }
}
