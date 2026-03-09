import { describe, it, expect } from "vitest";
import { createOutlineDeepGraph } from "../../../src/graphs/outline-deep.js";
import { FakeListChatModel } from "@langchain/core/utils/testing";

describe("createOutlineDeepGraph", () => {
  function createFakeLLM() {
    return new FakeListChatModel({ responses: ["unused"] });
  }

  it("compiles without error", () => {
    const graph = createOutlineDeepGraph(createFakeLLM());
    expect(graph).toBeDefined();
  });

  it("has correct node structure", () => {
    const graph = createOutlineDeepGraph(createFakeLLM());
    const nodes = graph.getGraph().nodes;
    const nodeNames = Object.keys(nodes);
    expect(nodeNames).toContain("process");
  });

  it("executes and produces outline", async () => {
    const graph = createOutlineDeepGraph(createFakeLLM());
    const result = await graph.invoke({
      sources: ["Test source"],
      messages: [],
    });

    expect(result.outline).toBe("Hello, I am the Deep Analysis Agent.");
    expect(result.stage).toBe("complete");
    expect(result.messages.length).toBe(1);
  });
});
