import { Agent } from "agents";
import type { AgentRequestBody, AgentState } from "../types.js";
import { AgentLogger, type Logger } from "../infrastructure/logger.js";
import { handleHealthRequest } from "../infrastructure/health.js";
import { parseAndValidateRequest } from "../infrastructure/request-handler.js";
import { createSseStream } from "../sse/stream-adapter.js";
import { LangChainAgent } from "../langchain/lang-chain-agent.js";
import type { SqlTagFn } from "../langchain/checkpoint-saver.js";

export abstract class BaseOutlineAgent extends Agent<Env, AgentState> {
  private langChainAgent?: LangChainAgent;

  abstract getAgentType(): string;
  abstract createLangChainAgent(
    apiKey: string,
    sql: SqlTagFn,
  ): LangChainAgent;

  onStart(): void {
    const apiKey = this.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is required but not set");
    }
    const sql = this.sql.bind(this) as SqlTagFn;
    this.langChainAgent = this.createLangChainAgent(apiKey, sql);
    void this.langChainAgent.setup();
  }

  async onRequest(request: Request): Promise<Response> {
    const requestId =
      request.headers.get("X-Request-ID") ?? crypto.randomUUID();
    const logger: Logger = new AgentLogger({
      agent: this.getAgentType(),
      requestId,
    });

    if (request.method === "GET") {
      const url = new URL(request.url);
      if (url.pathname.endsWith("/health")) {
        return handleHealthRequest(this.getAgentType());
      }
    }

    if (request.method !== "POST") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405, headers: { Allow: "POST, GET" } },
      );
    }

    let body: AgentRequestBody;
    try {
      body = (await request.json()) as AgentRequestBody;
    } catch {
      logger.warn("Invalid JSON in request body");
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    logger.info("Request received", { inputItems: body.input?.length });

    const result = parseAndValidateRequest(body, logger);
    if ("error" in result) {
      return Response.json(
        { error: result.error },
        { status: result.status },
      );
    }

    const { sources } = result;
    logger.info("Input parsed", { sourceCount: sources.length });

    const stream = await this.processRequest(sources, logger);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Request-ID": requestId,
      },
    });
  }

  protected async processRequest(
    sources: string[],
    logger: Logger,
  ): Promise<ReadableStream> {
    const stream = await this.langChainAgent!.process(sources);
    return createSseStream(stream, logger);
  }
}
