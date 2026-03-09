import { Agent } from "agents";
import type { AgentRequestBody, AgentState } from "../types.js";
import { AgentLogger, type Logger } from "../infrastructure/logger.js";
import { handleHealthRequest } from "../infrastructure/health.js";
import { parseAndValidateRequest } from "../infrastructure/request-handler.js";
import {
  createLangGraphSseStream,
  staticContent,
} from "../sse/stream-adapter.js";
import { createLLM } from "../llm/openrouter.js";
import { AgentSqlCheckpointSaver } from "../llm/checkpoint-saver.js";
import type { ChatOpenAI } from "@langchain/openai";

export interface StreamableGraph {
  stream(
    input: Record<string, unknown>,
    config: Record<string, unknown>,
  ): Promise<AsyncIterable<unknown>>;
}

export abstract class BaseOutlineAgent extends Agent<Env, AgentState> {
  private checkpointer: AgentSqlCheckpointSaver | undefined;

  abstract getAgentType(): string;
  abstract createGraph(
    llm: ChatOpenAI,
    checkpointer: AgentSqlCheckpointSaver,
  ): StreamableGraph;

  onStart(): void {
    this.checkpointer = new AgentSqlCheckpointSaver(
      this.sql.bind(this) as (
        strings: TemplateStringsArray,
        ...values: unknown[]
      ) => unknown[],
    );
    void this.checkpointer.setup();
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
    const apiKey = this.env.OPENROUTER_API_KEY;

    if (!apiKey || !this.checkpointer) {
      logger.warn("LLM not configured, using static response");
      return createLangGraphSseStream(staticContent(sources), logger);
    }

    try {
      const llm = createLLM(apiKey);
      const graph = this.createGraph(llm, this.checkpointer);
      const threadId = crypto.randomUUID();

      logger.info("Starting graph execution", {
        graphType: this.getAgentType(),
        threadId,
      });

      const graphStream = await graph.stream(
        { sources, messages: [] },
        {
          configurable: { thread_id: threadId },
          streamMode: "messages",
        },
      );

      return createLangGraphSseStream(graphStream, logger);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start graph";
      logger.error("Graph initialization failed", { error: message });
      return createLangGraphSseStream(staticContent(sources), logger);
    }
  }
}
