import { BaseAgent } from "./base-agent.js";
import { ReactLangChainAgent } from "../langchain/outline-react.js";
import type { SqlTagFn } from "../langchain/checkpoint-saver.js";
import { createSseStream } from "../sse/stream-adapter.js";
import type { Logger } from "../infrastructure/logger.js";

export class OutlineReactAgent extends BaseAgent {
  private langChainAgent?: ReactLangChainAgent;

  getAgentId(): string {
    return "outline-react";
  }

  protected async processRequest(
    sources: string[],
    logger: Logger,
  ): Promise<ReadableStream> {
    if (!this.langChainAgent) {
      const apiKey = this.env.OPENROUTER_API_KEY;
      if (!apiKey) throw new Error("OPENROUTER_API_KEY is required but not set");
      this.langChainAgent = new ReactLangChainAgent(apiKey, this.sql.bind(this) as SqlTagFn);
    }
    const stream = await this.langChainAgent.process(sources);
    return createSseStream(stream, logger);
  }
}
