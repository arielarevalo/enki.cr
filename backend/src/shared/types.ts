import type { Logger } from "../infrastructure/logger.js";
import type { KeyLookup } from "../infrastructure/auth.js";
import type { KeyService } from "../keys/key.service.js";
import type { OutlineService } from "../outline/outline.service.js";
import type { AgentProvider } from "../agents/agent-provider.js";
import type { SettingsRepository } from "../infrastructure/settings.repository.js";

export interface AppVariables {
  logger: Logger;
  keyLookup: KeyLookup;
  keyService: KeyService;
  outlineService: OutlineService;
  agentProvider: AgentProvider;
  settingsRepository: SettingsRepository;
}

export type AppEnv = { Bindings: Env; Variables: AppVariables };
