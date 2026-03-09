import { StateGraph } from "@langchain/langgraph";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage } from "@langchain/core/messages";
import type { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { OutlineAnnotation, type OutlineState } from "./state.js";

export function createOutlineDeepGraph(
  llm: BaseChatModel,
  checkpointer?: BaseCheckpointSaver,
) {
  const graph = new StateGraph(OutlineAnnotation)
    .addNode("process", async (_state: OutlineState) => ({
      messages: [new AIMessage("Hello, I am the Deep Analysis Agent.")],
      outline: "Hello, I am the Deep Analysis Agent.",
      stage: "complete",
    }))
    .addEdge("__start__", "process")
    .addEdge("process", "__end__");

  return graph.compile({ checkpointer });
}
