import type { Logger } from "../infrastructure/logger.js";
import type { KeyLookup } from "../infrastructure/auth.js";
import type { KeyService } from "../keys/key.service.js";
import type { OutlineService } from "../outline/outline.service.js";
import type { AgentProvider } from "../agents/agent-provider.js";
import type { DemoService } from "../demos/demo.service.js";

export interface AppVariables {
  logger: Logger;
  keyLookup: KeyLookup;
  keyService: KeyService;
  outlineService: OutlineService;
  agentProvider: AgentProvider;
  demoService: DemoService;
}

export type AppEnv = { Bindings: Env; Variables: AppVariables };
