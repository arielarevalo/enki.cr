import { Agent, routeAgentRequest } from "agents";

type AgentState = Record<string, unknown>;

interface InputItem {
  type: string;
  text?: string;
}

interface AgentRequestBody {
  input?: InputItem[];
  stream?: boolean;
  text?: { format?: { type?: string } };
}

function sseEvent(event: string, data: object): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function createResponseStream(sources: string[]): ReadableStream {
  const encoder = new TextEncoder();
  const responseId = `resp_${crypto.randomUUID()}`;
  const messageId = `msg_${crypto.randomUUID()}`;
  const createdAt = Math.floor(Date.now() / 1000);

  const fullText = JSON.stringify({
    message: "Hello from Enki",
    sources_received: sources,
  });

  return new ReadableStream({
    start(controller) {
      // 1. response.created
      controller.enqueue(
        encoder.encode(
          sseEvent("response.created", {
            type: "response.created",
            response: {
              id: responseId,
              object: "response",
              created_at: createdAt,
              status: "in_progress",
              output: [],
            },
          }),
        ),
      );

      // 2. response.output_item.added
      controller.enqueue(
        encoder.encode(
          sseEvent("response.output_item.added", {
            type: "response.output_item.added",
            output_index: 0,
            item: {
              type: "message",
              id: messageId,
              status: "in_progress",
              role: "assistant",
              content: [],
            },
          }),
        ),
      );

      // 3. response.content_part.added
      controller.enqueue(
        encoder.encode(
          sseEvent("response.content_part.added", {
            type: "response.content_part.added",
            item_id: messageId,
            output_index: 0,
            content_index: 0,
            part: { type: "output_text", text: "", annotations: [] },
          }),
        ),
      );

      // 4. response.output_text.delta
      controller.enqueue(
        encoder.encode(
          sseEvent("response.output_text.delta", {
            type: "response.output_text.delta",
            item_id: messageId,
            output_index: 0,
            content_index: 0,
            delta: fullText,
          }),
        ),
      );

      // 5. response.output_text.done
      controller.enqueue(
        encoder.encode(
          sseEvent("response.output_text.done", {
            type: "response.output_text.done",
            item_id: messageId,
            output_index: 0,
            content_index: 0,
            text: fullText,
          }),
        ),
      );

      const completedPart = {
        type: "output_text",
        text: fullText,
        annotations: [],
      };

      // 6. response.content_part.done
      controller.enqueue(
        encoder.encode(
          sseEvent("response.content_part.done", {
            type: "response.content_part.done",
            item_id: messageId,
            output_index: 0,
            content_index: 0,
            part: completedPart,
          }),
        ),
      );

      const completedItem = {
        type: "message",
        id: messageId,
        status: "completed",
        role: "assistant",
        content: [completedPart],
      };

      // 7. response.output_item.done
      controller.enqueue(
        encoder.encode(
          sseEvent("response.output_item.done", {
            type: "response.output_item.done",
            output_index: 0,
            item: completedItem,
          }),
        ),
      );

      // 8. response.completed
      controller.enqueue(
        encoder.encode(
          sseEvent("response.completed", {
            type: "response.completed",
            response: {
              id: responseId,
              object: "response",
              created_at: createdAt,
              status: "completed",
              output: [completedItem],
            },
          }),
        ),
      );

      controller.close();
    },
  });
}

async function handleAgentRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: { Allow: "POST" } },
    );
  }

  let body: AgentRequestBody;
  try {
    body = (await request.json()) as AgentRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const input = body.input;
  if (!Array.isArray(input) || input.length === 0) {
    return Response.json(
      { error: "input must be a non-empty array" },
      { status: 400 },
    );
  }

  const sources = input
    .filter((item) => item.type === "input_text" && typeof item.text === "string")
    .map((item) => item.text as string);

  if (sources.length === 0) {
    return Response.json(
      { error: "input must contain at least one input_text item" },
      { status: 400 },
    );
  }

  return new Response(createResponseStream(sources), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export class OutlineDeepAgent extends Agent<Env, AgentState> {
  async onRequest(request: Request): Promise<Response> {
    return handleAgentRequest(request);
  }
}

export class OutlineReactAgent extends Agent<Env, AgentState> {
  async onRequest(request: Request): Promise<Response> {
    return handleAgentRequest(request);
  }
}

export class OutlineWorkflowAgent extends Agent<Env, AgentState> {
  async onRequest(request: Request): Promise<Response> {
    return handleAgentRequest(request);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await routeAgentRequest(request, env);
    if (response) return response;

    return new Response("Not Found", { status: 404 });
  },
};
