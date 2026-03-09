import { routeAgentRequest } from "agents";

export { OutlineDeepAgent } from "./agents/outline-deep-agent.js";
export { OutlineReactAgent } from "./agents/outline-react-agent.js";
export { OutlineWorkflowAgent } from "./agents/outline-workflow-agent.js";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await routeAgentRequest(request, env);
    if (response) return response;

    return new Response("Not Found", { status: 404 });
  },
};
