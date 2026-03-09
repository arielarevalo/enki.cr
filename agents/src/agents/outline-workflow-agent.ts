import { BaseOutlineAgent } from "./base-outline-agent.js";
import type { LangChainAgent } from "../langchain/lang-chain-agent.js";
import type { SqlTagFn } from "../langchain/checkpoint-saver.js";
import { WorkflowLangChainAgent } from "../langchain/outline-workflow.js";

export class OutlineWorkflowAgent extends BaseOutlineAgent {
  getAgentType(): string {
    return "outline-workflow";
  }

  createLangChainAgent(apiKey: string, sql: SqlTagFn): LangChainAgent {
    return new WorkflowLangChainAgent(apiKey, sql);
  }
}
