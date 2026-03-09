import { BaseOutlineAgent, type StreamableGraph } from "./base-outline-agent.js";
import { createOutlineReactGraph } from "../graphs/outline-react.js";
import type { ChatOpenAI } from "@langchain/openai";
import type { AgentSqlCheckpointSaver } from "../llm/checkpoint-saver.js";

export class OutlineReactAgent extends BaseOutlineAgent {
  getAgentType(): string {
    return "outline-react";
  }

  createGraph(llm: ChatOpenAI, checkpointer: AgentSqlCheckpointSaver): StreamableGraph {
    return createOutlineReactGraph(llm, checkpointer);
  }
}
