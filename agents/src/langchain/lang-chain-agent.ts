import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AgentSqlCheckpointSaver, type SqlTagFn } from "./checkpoint-saver.js";
import { createLLM } from "./openrouter.js";

interface StreamableGraph {
  stream(
    input: Record<string, unknown>,
    config: Record<string, unknown>,
  ): Promise<AsyncIterable<unknown>>;
}

export abstract class LangChainAgent {
  protected readonly llm: BaseChatModel;
  protected readonly checkpointer: AgentSqlCheckpointSaver;

  constructor(apiKey: string, sql: SqlTagFn) {
    this.llm = createLLM(apiKey);
    this.checkpointer = new AgentSqlCheckpointSaver(sql);
  }

  async setup(): Promise<void> {
    await this.checkpointer.setup();
  }

  protected abstract compile(): StreamableGraph;

  async process(sources: string[]): Promise<AsyncIterable<unknown>> {
    const graph = this.compile();
    return graph.stream(
      { sources, messages: [] },
      { configurable: { thread_id: crypto.randomUUID() }, streamMode: "messages" },
    );
  }
}
