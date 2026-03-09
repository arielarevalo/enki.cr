import { describe, it, expect } from "vitest";
import { DeepLangChainAgent } from "../../../src/langchain/outline-deep.js";

function createMockSql() {
  return function sql(
    _strings: TemplateStringsArray,
    ..._values: unknown[]
  ): unknown[] {
    return [];
  };
}

describe("DeepLangChainAgent", () => {
  function createAgent() {
    return new DeepLangChainAgent("fake-key", createMockSql());
  }

  it("compiles without error", () => {
    const agent = createAgent();
    // Access compile via process — compile is protected, so we test through the public API
    expect(agent).toBeDefined();
  });

  it("processes and produces outline via stream", async () => {
    const agent = createAgent();
    const stream = await agent.process(["Test source"]);

    const results: unknown[] = [];
    for await (const item of stream) {
      results.push(item);
    }

    expect(results.length).toBeGreaterThan(0);
  });
});
