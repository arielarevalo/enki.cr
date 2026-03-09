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

export interface Demo {
  id: string;
  name: string;
  description: string;
}

let selectedDemo: Demo | null = null;

export function setSelectedDemo(demo: Demo) {
  selectedDemo = demo;
}

export function getSelectedDemo(): Demo | null {
  return selectedDemo;
}

export async function fetchDemos(): Promise<{ demos: Demo[]; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/demos/`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      let message = "Failed to fetch demos";
      try {
        const body = await res.json();
        if (body?.error?.message) message = body.error.message;
      } catch {
        // use default
      }
      return { demos: [], error: message };
    }
    const body = await res.json();
    return { demos: body.demos ?? [] };
  } catch {
    return { demos: [], error: "Failed to connect to server" };
  }
}

export function normalizeUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) return `https://${url}`;
  return url;
}

export async function validateApiKey(
  key: string,
): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/check`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) return { valid: true };
    let message = "Invalid API key";
    try {
      const body = await res.json();
      if (body?.error?.message) message = body.error.message;
      else if (body?.error) message = body.error;
    } catch {
      // use default
    }
    return { valid: false, error: message };
  } catch {
    return { valid: false, error: "Failed to connect to server" };
  }
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
    let accumulatedText = "";

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
              accumulatedText += `\n\nError: ${parsed.error.message}`;
              yield { content: [{ type: "text" as const, text: accumulatedText }] };
              return;
            }

            // Responses API: stream text deltas
            if (parsed.type === "response.output_text.delta" && parsed.delta) {
              accumulatedText += parsed.delta;
              yield { content: [{ type: "text" as const, text: accumulatedText }] };
            }

            // Responses API: completed — sync final text
            if (parsed.type === "response.completed") {
              const finalText =
                parsed.response?.output?.[0]?.content?.[0]?.text;
              if (finalText && finalText !== accumulatedText) {
                yield { content: [{ type: "text" as const, text: finalText }] };
              }
            }
          } catch {
            // skip unparseable lines
          }
        }
      }
    }

    // If stream ended without any content, yield empty state
    if (!accumulatedText) {
      return;
    }
  },
};
