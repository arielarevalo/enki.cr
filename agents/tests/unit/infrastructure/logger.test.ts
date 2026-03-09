import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentLogger } from "../../../src/infrastructure/logger.js";

describe("AgentLogger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("logs info as structured JSON", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new AgentLogger({ agent: "test" });
    logger.info("test message");

    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("test message");
    expect(parsed.agent).toBe("test");
    expect(parsed.timestamp).toBeDefined();
  });

  it("logs warn as structured JSON", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logger = new AgentLogger();
    logger.warn("warning", { code: 42 });

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe("warn");
    expect(parsed.message).toBe("warning");
    expect(parsed.code).toBe(42);
  });

  it("logs error as structured JSON", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logger = new AgentLogger();
    logger.error("failure");

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe("error");
    expect(parsed.message).toBe("failure");
  });

  it("merges base context with per-call context", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new AgentLogger({ agent: "deep", requestId: "r1" });
    logger.info("msg", { extra: true });

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.agent).toBe("deep");
    expect(parsed.requestId).toBe("r1");
    expect(parsed.extra).toBe(true);
  });

  it("withContext creates child logger with merged context", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const parent = new AgentLogger({ agent: "deep" });
    const child = parent.withContext({ requestId: "r2" });
    child.info("child message");

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.agent).toBe("deep");
    expect(parsed.requestId).toBe("r2");
    expect(parsed.message).toBe("child message");
  });
});
