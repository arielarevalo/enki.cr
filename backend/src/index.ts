import { D1DataStore } from "./providers/d1-data-store.js";
import { CloudflareAgentProvider } from "./providers/cloudflare-agent-provider.js";
import { CfLogger } from "./providers/cf-logger.js";
import { handleOutlineProcess } from "./routes/outline.js";
import {
  handleListAgents,
  handleGetActiveAgent,
  handleSetActiveAgent,
  handleCreateKey,
  handleListKeys,
  handleRevokeKey,
} from "./routes/admin.js";
import { handlePreflight, addCorsHeaders } from "./middleware/cors.js";
import { errorResponse } from "./errors.js";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const store = new D1DataStore(env.DB);
    const agents = new CloudflareAgentProvider(env.AGENTS_BASE_URL);
    const logger = new CfLogger();

    // CORS preflight for outline routes
    if (method === "OPTIONS" && path.startsWith("/api/outline/")) {
      return handlePreflight();
    }

    const start = Date.now();
    let response: Response;

    try {
      response = await route(method, path, request, store, agents, logger);
    } catch (err) {
      logger.error("Unhandled error", { error: String(err), path, method });
      response = errorResponse(
        500,
        "internal_error",
        "An unexpected error occurred",
      );
    }

    // Add CORS headers for outline routes
    if (path.startsWith("/api/outline/")) {
      response = addCorsHeaders(response);
    }

    logger.info("Request", {
      method,
      path,
      status: response.status,
      duration_ms: Date.now() - start,
    });

    return response;
  },
};

async function route(
  method: string,
  path: string,
  request: Request,
  store: D1DataStore,
  agents: CloudflareAgentProvider,
  logger: CfLogger,
): Promise<Response> {
  // Outline routes
  if (path === "/api/outline/process" && method === "POST") {
    return handleOutlineProcess(request, store, agents, logger);
  }

  // Admin agent routes
  if (path === "/api/admin/agents" && method === "GET") {
    return handleListAgents(request, store, agents, logger);
  }
  if (path === "/api/admin/agents/active") {
    if (method === "GET") return handleGetActiveAgent(request, store, logger);
    if (method === "PUT")
      return handleSetActiveAgent(request, store, agents, logger);
  }

  // Admin key routes
  if (path === "/api/admin/keys") {
    if (method === "POST") return handleCreateKey(request, store, logger);
    if (method === "GET") return handleListKeys(request, store, logger);
  }

  const keyMatch = path.match(/^\/api\/admin\/keys\/([^/]+)$/);
  if (keyMatch && method === "DELETE") {
    return handleRevokeKey(request, store, logger, keyMatch[1]);
  }

  return errorResponse(404, "not_found", "Unknown route");
}
