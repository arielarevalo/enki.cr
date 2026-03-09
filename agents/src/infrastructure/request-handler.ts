import type { AgentRequestBody } from "../types.js";
import type { Logger } from "./logger.js";

const MAX_SOURCE_LENGTH = 10_000;

function stripControlChars(str: string): string {
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

export function parseAndValidateRequest(
  body: AgentRequestBody,
  logger: Logger,
): { sources: string[] } | { error: string; status: number } {
  const input = body.input;
  if (!Array.isArray(input) || input.length === 0) {
    logger.warn("Invalid input: not a non-empty array");
    return { error: "input must be a non-empty array", status: 400 };
  }

  const sources = input
    .filter((item) => item.type === "input_text" && typeof item.text === "string")
    .map((item) => {
      let text = (item.text as string).trim();
      text = stripControlChars(text);
      if (text.length > MAX_SOURCE_LENGTH) {
        text = text.slice(0, MAX_SOURCE_LENGTH);
      }
      return text;
    })
    .filter((text) => text.length > 0);

  if (sources.length === 0) {
    logger.warn("No valid input_text items found");
    return {
      error: "input must contain at least one input_text item",
      status: 400,
    };
  }

  return { sources };
}
