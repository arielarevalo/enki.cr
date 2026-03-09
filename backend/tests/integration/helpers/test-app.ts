import type { AppDeps } from "../../../src/app.js";
import { createApp } from "../../../src/app.js";
import {
  createMockKeyRepository,
  createMockDemoRepository,
  createMockAgentProvider,
  createMockLogger,
} from "./mocks.js";

function defaultMocks(): AppDeps {
  return {
    logger: createMockLogger(),
    keyRepository: createMockKeyRepository(),
    demoRepository: createMockDemoRepository(),
    agentProvider: createMockAgentProvider(),
  };
}

export function createTestApp(overrides?: Partial<AppDeps>) {
  return createApp({ ...defaultMocks(), ...overrides });
}
