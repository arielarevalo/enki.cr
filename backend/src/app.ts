import type { Logger } from "./infrastructure/logger.js";
import type { KeyRepository } from "./keys/key-repository.js";
import type { SettingsRepository } from "./infrastructure/settings.repository.js";
import type { AgentProvider } from "./agents/agent-provider.js";
import { KeyService } from "./keys/key.service.js";
import { OutlineService } from "./outline/outline.service.js";
import { createRouter } from "./router.js";

export interface AppDeps {
  logger: Logger;
  keyRepository: KeyRepository;
  settingsRepository: SettingsRepository;
  agentProvider: AgentProvider;
}

export function createApp(
  deps: AppDeps,
): { fetch: (request: Request) => Promise<Response> } {
  const keyService = new KeyService(deps.keyRepository);
  const outlineService = new OutlineService(
    deps.settingsRepository,
    deps.agentProvider,
    deps.logger,
  );

  return createRouter({
    logger: deps.logger,
    keyLookup: deps.keyRepository,
    keyService,
    settingsRepository: deps.settingsRepository,
    agentProvider: deps.agentProvider,
    outlineService,
  });
}
