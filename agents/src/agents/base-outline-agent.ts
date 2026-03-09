import { BaseAgent } from "./base-agent.js";
import { LangChainAgent } from "../langchain/lang-chain-agent.js";
import type { SqlTagFn } from "../langchain/checkpoint-saver.js";
import { createSseStream } from "../sse/stream-adapter.js";
import type { Logger } from "../infrastructure/logger.js";

export abstract class BaseOutlineAgent extends BaseAgent {
  private langChainAgent?: LangChainAgent;

  abstract createLangChainAgent(
    apiKey: string,
    sql: SqlTagFn,
  ): LangChainAgent;

  onStart(): void {
    const apiKey = this.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is required but not set");
    }
    const sql = this.sql.bind(this) as SqlTagFn;
    this.langChainAgent = this.createLangChainAgent(apiKey, sql);
    void this.langChainAgent.setup();
  }

  protected async processRequest(
    sources: string[],
    logger: Logger,
  ): Promise<ReadableStream> {
    const stream = await this.langChainAgent!.process(sources);
    return createSseStream(stream, logger);
  }
}
