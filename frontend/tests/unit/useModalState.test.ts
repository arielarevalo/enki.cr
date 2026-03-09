import { describe, it, expect } from "vitest";
import { reducer } from "../../src/hooks/useModalState";

describe("reducer", () => {
  it("transitions from apiKey to demo on API_KEY_VALID", () => {
    expect(reducer("apiKey", { type: "API_KEY_VALID" })).toBe("demo");
  });

  it("transitions from demo to sources on DEMO_SELECTED", () => {
    expect(reducer("demo", { type: "DEMO_SELECTED" })).toBe("sources");
  });

  it("transitions to processing on PROCESS", () => {
    expect(reducer("sources", { type: "PROCESS" })).toBe("processing");
  });

  it("transitions to streaming on PROCESSING_DONE", () => {
    expect(reducer("processing", { type: "PROCESSING_DONE" })).toBe("streaming");
  });

  it("transitions to apiKey on RESET", () => {
    expect(reducer("streaming", { type: "RESET" })).toBe("apiKey");
  });

  it("follows full sequence: apiKey → demo → sources → processing → streaming", () => {
    let state = reducer("apiKey", { type: "API_KEY_VALID" });
    expect(state).toBe("demo");

    state = reducer(state, { type: "DEMO_SELECTED" });
    expect(state).toBe("sources");

    state = reducer(state, { type: "PROCESS" });
    expect(state).toBe("processing");

    state = reducer(state, { type: "PROCESSING_DONE" });
    expect(state).toBe("streaming");
  });
});
