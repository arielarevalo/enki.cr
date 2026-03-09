import type { ChatModelAdapter } from "@assistant-ui/react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

let apiKey = "";
let pendingSources: string[] = [];

export function setApiKey(key: string) {
  apiKey = key;
}

export function setSources(sources: string[]) {
  pendingSources = sources;
}

function normalizeUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) return `https://${url}`;
  return url;
}

export const enkiAdapter: ChatModelAdapter = {
  async *run({ abortSignal }) {
    const sources = pendingSources.map(normalizeUrl);

    let response: Response;
    try {
      response = await fetch(`${API_BASE}/api/outline/process`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sources }),
        signal: abortSignal,
      });
    } catch {
      yield { content: [{ type: "text" as const, text: "Error: Failed to connect to server" }] };
      return;
    }

    if (!response.ok) {
      let message = `Error: ${response.status} ${response.statusText}`;
      try {
        const body = await response.json();
        if (body?.error?.message) message = `Error: ${body.error.message}`;
        else if (body?.error) message = `Error: ${body.error}`;
      } catch {
        // use default message
      }
      yield { content: [{ type: "text" as const, text: message }] };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { content: [{ type: "text" as const, text: "Error: No response stream" }] };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let accumulated = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const event = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);

        for (const line of event.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);

            // Detect inline SSE errors from validate-sse.ts
            if (parsed.error?.message) {
              accumulated += `\n\nError: ${parsed.error.message}`;
              yield { content: [{ type: "text" as const, text: accumulated }] };
              return;
            }

            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              yield { content: [{ type: "text" as const, text: accumulated }] };
            }
          } catch {
            // skip unparseable lines
          }
        }
      }
    }

    // Yield final state if we accumulated anything but didn't yield it yet
    if (accumulated) {
      yield { content: [{ type: "text" as const, text: accumulated }] };
    }
  },
};
