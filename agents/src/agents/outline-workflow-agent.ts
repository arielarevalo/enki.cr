import { BaseAgent } from "./base-agent.js";
import { WorkflowLangChainAgent } from "../langchain/outline-workflow.js";
import type { SqlTagFn } from "../langchain/checkpoint-saver.js";
import { createSseStream } from "../sse/stream-adapter.js";
import type { Logger } from "../infrastructure/logger.js";

export class OutlineWorkflowAgent extends BaseAgent {
  private langChainAgent?: WorkflowLangChainAgent;

  getAgentId(): string {
    return "outline-workflow";
  }

  async processRequest(
    sources: string[],
    logger: Logger,
  ): Promise<ReadableStream> {
    if (!this.langChainAgent) {
      const apiKey = this.env.OPENROUTER_API_KEY;
      if (!apiKey) throw new Error("OPENROUTER_API_KEY is required but not set");
      this.langChainAgent = new WorkflowLangChainAgent(apiKey, this.sql.bind(this) as SqlTagFn);
    }
    const stream = await this.langChainAgent.process(sources);
    return createSseStream(stream, logger);
  }
}
