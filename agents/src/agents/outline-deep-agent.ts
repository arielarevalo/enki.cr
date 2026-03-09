import { BaseOutlineAgent } from "./base-outline-agent.js";
import type { LangChainAgent } from "../langchain/lang-chain-agent.js";
import type { SqlTagFn } from "../langchain/checkpoint-saver.js";
import { DeepLangChainAgent } from "../langchain/outline-deep.js";

export class OutlineDeepAgent extends BaseOutlineAgent {
  getAgentType(): string {
    return "outline-deep";
  }

  createLangChainAgent(apiKey: string, sql: SqlTagFn): LangChainAgent {
    return new DeepLangChainAgent(apiKey, sql);
  }
}
