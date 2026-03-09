import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "./shared/types.js";
import type { Logger } from "./infrastructure/logger.js";
import type { KeyRepository } from "./keys/key-repository.js";
import type { DemoRepository } from "./demos/demo-repository.js";
import type { AgentProvider } from "./agents/agent-provider.js";
import { KeyService } from "./keys/key.service.js";
import { OutlineService } from "./outline/outline.service.js";
import { DemoService } from "./demos/demo.service.js";
import { healthRoutes } from "./health/health.routes.js";
import { authRoutes } from "./auth/auth.routes.js";
import { outlineRoutes } from "./outline/outline.routes.js";
import { agentRoutes } from "./agents/agents.routes.js";
import { keyRoutes } from "./keys/keys.routes.js";
import { demoRoutes } from "./demos/demos.routes.js";
import { adminDemoRoutes } from "./demos/admin-demos.routes.js";

export interface AppDeps {
  logger: Logger;
  keyRepository: KeyRepository;
  demoRepository: DemoRepository;
  agentProvider: AgentProvider;
}

export function createApp(deps: AppDeps) {
  const keyService = new KeyService(deps.keyRepository);
  const demoService = new DemoService(deps.demoRepository, deps.agentProvider);
  const outlineService = new OutlineService(
    deps.demoRepository,
    deps.agentProvider,
    deps.logger,
  );

  const app = new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        const issue = result.error.issues[0];
        const path = issue?.path?.join(".");
        const message = path
          ? `${path}: ${issue.message}`
          : (issue?.message ?? "Validation error");
        return c.json(
          { error: { type: "invalid_request", message } },
          400,
        );
      }
    },
  });

  // DI middleware
  app.use("*", async (c, next) => {
    c.set("logger", deps.logger);
    c.set("keyLookup", deps.keyRepository);
    c.set("keyService", keyService);
    c.set("outlineService", outlineService);
    c.set("agentProvider", deps.agentProvider);
    c.set("demoService", demoService);
    await next();
  });

  // CORS
  app.use(
    "/api/*",
    cors({
      origin: "https://enki.cr",
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Authorization", "Content-Type"],
    }),
  );

  // Request logging
  app.use("*", async (c, next) => {
    const start = Date.now();
    await next();
    deps.logger.info("Request", {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration_ms: Date.now() - start,
    });
  });

  // Global error handler
  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      const res = err.getResponse();
      if (res.headers.get("Content-Type")?.includes("application/json")) {
        return res;
      }
      // Non-JSON errors (e.g., Hono's "Malformed JSON") → wrap in JSON
      return new Response(
        JSON.stringify({
          error: { type: "invalid_request", message: "Invalid JSON body" },
        }),
        {
          status: err.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    deps.logger.error("Unhandled error", {
      error: String(err),
      path: c.req.path,
      method: c.req.method,
    });
    return c.json(
      {
        error: {
          type: "internal_error",
          message: "An unexpected error occurred",
        },
      },
      500,
    );
  });

  // Mount routes
  app.route("/health", healthRoutes);
  app.route("/api/auth", authRoutes);
  app.route("/api/demos", demoRoutes);
  app.route("/api/outline", outlineRoutes);
  app.route("/api/admin/agents", agentRoutes);
  app.route("/api/admin/demos", adminDemoRoutes);
  app.route("/api/admin/keys", keyRoutes);

  // OpenAPI spec + Swagger UI
  app.doc("/openapi.json", {
    openapi: "3.0.3",
    info: {
      title: "Enki API",
      description: "AI Engineering consulting platform API",
      version: "1.0.0",
    },
    servers: [
      { url: "http://localhost:8787", description: "Local" },
      { url: "https://api.enki.cr", description: "Production" },
    ],
  });
  app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    description: "API key (admin or client)",
  });
  app.get("/docs", swaggerUI({ url: "/openapi.json" }));

  return app;
}
