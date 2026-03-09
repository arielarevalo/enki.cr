export function handleHealthRequest(agentType: string): Response {
  return Response.json({
    status: "ok",
    agent: agentType,
    timestamp: new Date().toISOString(),
  });
}
