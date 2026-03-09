import type { Logger } from "./infrastructure/logger.js";
import type { KeyLookup } from "./infrastructure/auth.js";
import type { SettingsRepository } from "./infrastructure/settings.repository.js";
import type { AgentProvider } from "./agents/agent-provider.js";
import type { KeyService } from "./keys/key.service.js";
import type { OutlineService } from "./outline/outline.service.js";
import { handlePreflight, addCorsHeaders } from "./infrastructure/cors.js";
import { handleOutlineProcess } from "./outline/outline.handler.js";
import {
  handleListAgents,
  handleGetActiveAgent,
  handleSetActiveAgent,
} from "./agents/agents.handler.js";
import {
  handleCreateKey,
  handleListKeys,
  handleRevokeKey,
} from "./keys/keys.handler.js";
import { errorResponse } from "./shared/errors.js";

export interface RouterDeps {
  logger: Logger;
  keyLookup: KeyLookup;
  keyService: KeyService;
  settingsRepository: SettingsRepository;
  agentProvider: AgentProvider;
  outlineService: OutlineService;
}

export function createRouter(
  deps: RouterDeps,
): { fetch: (request: Request) => Promise<Response> } {
  return {
    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      if (method === "OPTIONS" && path.startsWith("/api/outline/")) {
        return handlePreflight();
      }

      const start = Date.now();
      let response: Response;

      try {
        response = await route(method, path, request, deps);
      } catch (err) {
        deps.logger.error("Unhandled error", {
          error: String(err),
          path,
          method,
        });
        response = errorResponse(
          500,
          "internal_error",
          "An unexpected error occurred",
        );
      }

      if (path.startsWith("/api/outline/")) {
        response = addCorsHeaders(response);
      }

      deps.logger.info("Request", {
        method,
        path,
        status: response.status,
        duration_ms: Date.now() - start,
      });

      return response;
    },
  };
}

async function route(
  method: string,
  path: string,
  request: Request,
  deps: RouterDeps,
): Promise<Response> {
  // Health check
  if (path === "/health" && method === "GET") {
    return Response.json({ status: "ok" });
  }

  // Outline routes
  if (path === "/api/outline/process" && method === "POST") {
    return handleOutlineProcess(request, deps.keyLookup, deps.outlineService);
  }

  // Admin agent routes
  if (path === "/api/admin/agents" && method === "GET") {
    return handleListAgents(
      request,
      deps.keyLookup,
      deps.agentProvider,
      deps.logger,
    );
  }
  if (path === "/api/admin/agents/active") {
    if (method === "GET") {
      return handleGetActiveAgent(
        request,
        deps.keyLookup,
        deps.settingsRepository,
        deps.logger,
      );
    }
    if (method === "PUT") {
      return handleSetActiveAgent(
        request,
        deps.keyLookup,
        deps.settingsRepository,
        deps.agentProvider,
        deps.logger,
      );
    }
  }

  // Admin key routes
  if (path === "/api/admin/keys") {
    if (method === "POST") {
      return handleCreateKey(
        request,
        deps.keyLookup,
        deps.keyService,
        deps.logger,
      );
    }
    if (method === "GET") {
      return handleListKeys(
        request,
        deps.keyLookup,
        deps.keyService,
        deps.logger,
      );
    }
  }

  const keyMatch = path.match(/^\/api\/admin\/keys\/([^/]+)$/);
  if (keyMatch && method === "DELETE") {
    return handleRevokeKey(
      request,
      deps.keyLookup,
      deps.keyService,
      deps.logger,
      keyMatch[1],
    );
  }

  return errorResponse(404, "not_found", "Unknown route");
}
