import type { AgentProvider } from "../agents/agent-provider.js";
import type { DemoRepository } from "../demos/demo-repository.js";
import { createSseValidationStream } from "../infrastructure/sse-validation.js";
import type { Logger } from "../infrastructure/logger.js";

export class OutlineService {
  constructor(
    private demoRepository: DemoRepository,
    private agentProvider: AgentProvider,
    private logger: Logger,
  ) {}

  async process(sources: string[]): Promise<ReadableStream> {
    const activeAgent = await this.demoRepository.getActiveAgent("outline");
    if (!activeAgent) {
      throw new NoActiveAgentError();
    }

    let stream: ReadableStream;
    try {
      this.logger.info("Invoking agent", { agent: activeAgent });
      stream = await this.agentProvider.invoke(activeAgent, { sources });
    } catch (err) {
      this.logger.error("Agent invocation failed", {
        agent: activeAgent,
        error: String(err),
      });
      throw new AgentInvocationError();
    }

    const validationStream = createSseValidationStream();
    return stream.pipeThrough(validationStream);
  }
}

export class NoActiveAgentError extends Error {
  constructor() {
    super("No active agent configured");
    this.name = "NoActiveAgentError";
  }
}

export class AgentInvocationError extends Error {
  constructor() {
    super("Failed to reach agent");
    this.name = "AgentInvocationError";
  }
}
