import { describe, it, expect } from "vitest";
import { isValidSource } from "../../src/utils/validation";

describe("isValidSource", () => {
  it.each([
    "example.com",
    "example.com/path",
    "sub.example.com",
    "a.b",
  ])("accepts valid source: %s", (input) => {
    expect(isValidSource(input)).toBe(true);
  });

  it.each([
    "",
    "   ",
    "nodot",
    "/path/only",
  ])("rejects invalid source: %j", (input) => {
    expect(isValidSource(input)).toBe(false);
  });
});
