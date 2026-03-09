import { Agent, routeAgentRequest } from "agents";

type AgentState = Record<string, unknown>;

export class OutlineDeepAgent extends Agent<Env, AgentState> {
  async onRequest(request: Request): Promise<Response> {
    return Response.json({
      agent: "OutlineDeepAgent",
      message: "Hello from Outline Deep Agent",
    });
  }
}

export class OutlineReactAgent extends Agent<Env, AgentState> {
  async onRequest(request: Request): Promise<Response> {
    return Response.json({
      agent: "OutlineReactAgent",
      message: "Hello from Outline React Agent",
    });
  }
}

export class OutlineWorkflowAgent extends Agent<Env, AgentState> {
  async onRequest(request: Request): Promise<Response> {
    return Response.json({
      agent: "OutlineWorkflowAgent",
      message: "Hello from Outline Workflow Agent",
    });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await routeAgentRequest(request, env);
    if (response) return response;

    return new Response("Not Found", { status: 404 });
  },
};
