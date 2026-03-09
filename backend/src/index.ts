import { CfLogger } from "./infrastructure/logger.js";
import { D1KeyRepository } from "./keys/d1-key.repository.js";
import { D1DemoRepository } from "./demos/d1-demo.repository.js";
import { CloudflareAgentProvider } from "./agents/cloudflare-agent-provider.js";
import { createApp } from "./app.js";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const app = createApp({
      logger: new CfLogger(),
      keyRepository: new D1KeyRepository(env.DB),
      demoRepository: new D1DemoRepository(env.DB),
      agentProvider: new CloudflareAgentProvider(env.AGENTS_BASE_URL),
    });
    return app.fetch(request, env, ctx);
  },
};
