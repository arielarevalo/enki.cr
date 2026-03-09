import { routeAgentRequest } from "agents";

export { OutlineDeepAgent } from "./agents/outline-deep-agent.js";
export { OutlineReactAgent } from "./agents/outline-react-agent.js";
export { OutlineWorkflowAgent } from "./agents/outline-workflow-agent.js";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/agents" || url.pathname === "/agents/") {
      const agents = [
        { name: "OutlineDeepAgent", description: "Deep Agent" },
        { name: "OutlineReactAgent", description: "ReAct Agent" },
        { name: "OutlineWorkflowAgent", description: "Workflow Agent" },
      ];
      return Response.json({ agents });
    }

    const response = await routeAgentRequest(request, env);
    if (response) return response;

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
