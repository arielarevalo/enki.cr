import { BaseOutlineAgent } from "./base-outline-agent.js";
import type { LangChainAgent } from "../langchain/lang-chain-agent.js";
import type { SqlTagFn } from "../langchain/checkpoint-saver.js";
import { ReactLangChainAgent } from "../langchain/outline-react.js";

export class OutlineReactAgent extends BaseOutlineAgent {
  getAgentType(): string {
    return "outline-react";
  }

  createLangChainAgent(apiKey: string, sql: SqlTagFn): LangChainAgent {
    return new ReactLangChainAgent(apiKey, sql);
  }
}
