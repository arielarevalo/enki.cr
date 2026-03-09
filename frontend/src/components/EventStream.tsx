import { useRef, useEffect } from "react";
import {
  ThreadPrimitive,
  MessagePrimitive,
  useThread,
} from "@assistant-ui/react";
import ReactMarkdown from "react-markdown";

interface EventStreamProps {
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function EventStream({ expanded, onToggleExpand }: EventStreamProps) {
  const thread = useThread();
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const observer = new MutationObserver(() => {
      el.scrollTop = el.scrollHeight;
    });

    observer.observe(el, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, []);

  if (!thread.isRunning) {
    const lastMessage = [...thread.messages].reverse().find((m) => m.role === "assistant");
    const textParts = lastMessage?.content
      .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text");
    const fullText = textParts?.map((p) => p.text).join("") ?? "";

    if (fullText) {
      return (
        <div className="event-stream">
          <div className="result__header">
            <button
              className="result__expand"
              onClick={onToggleExpand}
              aria-label={expanded ? "Collapse result" : "Expand result"}
            >
              {expanded ? "\u2296" : "\u2295"}
            </button>
          </div>
          <div className="event-stream__viewport">
            <div className="result__body">
              <div className="result__markdown">
                <ReactMarkdown>{fullText}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="event-stream">
      <div className="event-stream__status">
        <div className="event-stream__spinner" />
      </div>
      <ThreadPrimitive.Root>
        <div ref={viewportRef} className="event-stream__viewport">
          <ThreadPrimitive.Messages
            components={{
              UserMessage: () => null,
              AssistantMessage: AssistantMessage,
            }}
          />
        </div>
      </ThreadPrimitive.Root>
    </div>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="event-stream__message">
      <MessagePrimitive.Content
        components={{
          Text: ({ text }) => (
            <span className="event-stream__text">{text}</span>
          ),
        }}
      />
    </MessagePrimitive.Root>
  );
}
