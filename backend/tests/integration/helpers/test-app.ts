import type { AppDeps } from "../../../src/app.js";
import { createApp } from "../../../src/app.js";
import {
  createMockKeyRepository,
  createMockSettingsRepository,
  createMockAgentProvider,
  createMockLogger,
} from "./mocks.js";

function defaultMocks(): AppDeps {
  return {
    logger: createMockLogger(),
    keyRepository: createMockKeyRepository(),
    settingsRepository: createMockSettingsRepository(),
    agentProvider: createMockAgentProvider(),
  };
}

export function createTestApp(overrides?: Partial<AppDeps>) {
  return createApp({ ...defaultMocks(), ...overrides });
}
