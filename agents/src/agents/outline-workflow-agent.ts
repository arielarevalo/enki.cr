import { BaseOutlineAgent, type StreamableGraph } from "./base-outline-agent.js";
import { createOutlineWorkflowGraph } from "../graphs/outline-workflow.js";
import type { ChatOpenAI } from "@langchain/openai";
import type { AgentSqlCheckpointSaver } from "../llm/checkpoint-saver.js";

export class OutlineWorkflowAgent extends BaseOutlineAgent {
  getAgentType(): string {
    return "outline-workflow";
  }

  createGraph(llm: ChatOpenAI, checkpointer: AgentSqlCheckpointSaver): StreamableGraph {
    return createOutlineWorkflowGraph(llm, checkpointer);
  }
}
