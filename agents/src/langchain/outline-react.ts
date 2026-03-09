import { StateGraph } from "@langchain/langgraph";
import { AIMessage } from "@langchain/core/messages";
import { LangChainAgent } from "./lang-chain-agent.js";
import { OutlineAnnotation, type OutlineState } from "./state.js";

export class ReactLangChainAgent extends LangChainAgent {
  protected compile() {
    return new StateGraph(OutlineAnnotation)
      .addNode("process", async (_state: OutlineState) => ({
        messages: [new AIMessage("Hello, I am the ReAct Agent.")],
        outline: "Hello, I am the ReAct Agent.",
        stage: "complete",
      }))
      .addEdge("__start__", "process")
      .addEdge("process", "__end__")
      .compile({ checkpointer: this.checkpointer });
  }
}
