import type { ChatModelAdapter } from "@assistant-ui/react";
import { mockEvents, mockFinalMarkdown } from "./data";

export const mockAdapter: ChatModelAdapter = {
  async *run() {
    // Stream mock events as individual text chunks
    for (const event of mockEvents) {
      await delay(200 + Math.random() * 600);
      yield {
        content: [{ type: "text" as const, text: event + "\n" }],
      };
    }

    // Final delay before the complete result
    await delay(500);
    yield {
      content: [{ type: "text" as const, text: mockFinalMarkdown }],
    };
  },
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
