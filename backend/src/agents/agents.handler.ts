import { authenticate } from "../infrastructure/auth.js";
import type { KeyLookup } from "../infrastructure/auth.js";
import type { Logger } from "../infrastructure/logger.js";
import type { SettingsRepository } from "../infrastructure/settings.repository.js";
import { errorResponse } from "../shared/errors.js";
import type { AgentProvider } from "./agent-provider.js";

export async function handleListAgents(
  request: Request,
  keyLookup: KeyLookup,
  agentProvider: AgentProvider,
  logger: Logger,
): Promise<Response> {
  const auth = await authenticate(request, keyLookup, ["admin"]);
  if (auth instanceof Response) return auth;

  logger.info("Listing agents");
  return Response.json({ agents: agentProvider.list() });
}

export async function handleGetActiveAgent(
  request: Request,
  keyLookup: KeyLookup,
  settingsRepository: SettingsRepository,
  logger: Logger,
): Promise<Response> {
  const auth = await authenticate(request, keyLookup, ["admin"]);
  if (auth instanceof Response) return auth;

  const activeAgent = await settingsRepository.get("active_agent");
  return Response.json({ active_agent: activeAgent });
}

export async function handleSetActiveAgent(
  request: Request,
  keyLookup: KeyLookup,
  settingsRepository: SettingsRepository,
  agentProvider: AgentProvider,
  logger: Logger,
): Promise<Response> {
  const auth = await authenticate(request, keyLookup, ["admin"]);
  if (auth instanceof Response) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_request", "Invalid JSON body");
  }

  if (typeof body !== "object" || body === null) {
    return errorResponse(
      400,
      "invalid_request",
      "Request body must be a JSON object",
    );
  }

  const { agent_id } = body as Record<string, unknown>;
  if (typeof agent_id !== "string") {
    return errorResponse(400, "invalid_request", "agent_id must be a string");
  }

  const available = agentProvider.list();
  if (!available.some((a) => a.id === agent_id)) {
    return errorResponse(
      400,
      "invalid_request",
      `Unknown agent: ${agent_id}`,
    );
  }

  await settingsRepository.set("active_agent", agent_id);
  logger.info("Active agent updated", { agent_id });

  return Response.json({ active_agent: agent_id });
}
