import { describe, it, expect, vi } from "vitest";
import { parseAndValidateRequest } from "../../../src/infrastructure/request-handler.js";
import type { Logger } from "../../../src/infrastructure/logger.js";

function createMockLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    withContext: vi.fn(() => createMockLogger()),
  };
}

describe("parseAndValidateRequest", () => {
  const logger = createMockLogger();

  it("returns error when input is missing", () => {
    const result = parseAndValidateRequest({}, logger);
    expect(result).toEqual({
      error: "input must be a non-empty array",
      status: 400,
    });
  });

  it("returns error when input is empty array", () => {
    const result = parseAndValidateRequest({ input: [] }, logger);
    expect(result).toEqual({
      error: "input must be a non-empty array",
      status: 400,
    });
  });

  it("returns error when input is not an array", () => {
    const result = parseAndValidateRequest(
      { input: "not-an-array" as never },
      logger,
    );
    expect(result).toEqual({
      error: "input must be a non-empty array",
      status: 400,
    });
  });

  it("returns error when no input_text items found", () => {
    const result = parseAndValidateRequest(
      { input: [{ type: "image" }] },
      logger,
    );
    expect(result).toEqual({
      error: "input must contain at least one input_text item",
      status: 400,
    });
  });

  it("extracts sources from valid input", () => {
    const result = parseAndValidateRequest(
      {
        input: [
          { type: "input_text", text: "Source 1" },
          { type: "input_text", text: "Source 2" },
        ],
      },
      logger,
    );
    expect(result).toEqual({ sources: ["Source 1", "Source 2"] });
  });

  it("filters out non-input_text items", () => {
    const result = parseAndValidateRequest(
      {
        input: [
          { type: "input_text", text: "Valid" },
          { type: "image", text: "Ignored" },
        ],
      },
      logger,
    );
    expect(result).toEqual({ sources: ["Valid"] });
  });

  it("trims whitespace from sources", () => {
    const result = parseAndValidateRequest(
      { input: [{ type: "input_text", text: "  hello  " }] },
      logger,
    );
    expect(result).toEqual({ sources: ["hello"] });
  });

  it("strips control characters", () => {
    const result = parseAndValidateRequest(
      { input: [{ type: "input_text", text: "hello\x00world\x07" }] },
      logger,
    );
    expect(result).toEqual({ sources: ["helloworld"] });
  });

  it("truncates sources exceeding max length", () => {
    const longText = "x".repeat(11_000);
    const result = parseAndValidateRequest(
      { input: [{ type: "input_text", text: longText }] },
      logger,
    );
    expect("sources" in result && result.sources[0].length).toBe(10_000);
  });

  it("filters out empty sources after trimming", () => {
    const result = parseAndValidateRequest(
      {
        input: [
          { type: "input_text", text: "   " },
          { type: "input_text", text: "valid" },
        ],
      },
      logger,
    );
    expect(result).toEqual({ sources: ["valid"] });
  });
});
