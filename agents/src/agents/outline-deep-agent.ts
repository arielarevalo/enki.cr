import { BaseOutlineAgent, type StreamableGraph } from "./base-outline-agent.js";
import { createOutlineDeepGraph } from "../graphs/outline-deep.js";
import type { ChatOpenAI } from "@langchain/openai";
import type { AgentSqlCheckpointSaver } from "../llm/checkpoint-saver.js";

export class OutlineDeepAgent extends BaseOutlineAgent {
  getAgentType(): string {
    return "outline-deep";
  }

  createGraph(llm: ChatOpenAI, checkpointer: AgentSqlCheckpointSaver): StreamableGraph {
    return createOutlineDeepGraph(llm, checkpointer);
  }
}
