import { CfLogger } from "./infrastructure/logger.js";
import { D1KeyRepository } from "./keys/d1-key.repository.js";
import { D1SettingsRepository } from "./infrastructure/d1-settings.repository.js";
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
      settingsRepository: new D1SettingsRepository(env.DB),
      agentProvider: new CloudflareAgentProvider(env.AGENTS_BASE_URL),
    });
    return app.fetch(request, env, ctx);
  },
};
