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

  if (!thread.isRunning) {
    // Extract the last text part from the last assistant message
    const lastMessage = [...thread.messages].reverse().find((m) => m.role === "assistant");
    const textParts = lastMessage?.content
      .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text");
    const lastTextPart = textParts && textParts[textParts.length - 1];

    if (lastTextPart) {
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
                <ReactMarkdown>{lastTextPart.text}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="event-stream">
      <ThreadPrimitive.Root>
        <ThreadPrimitive.Viewport autoScroll className="event-stream__viewport">
          <ThreadPrimitive.Messages
            components={{
              UserMessage: () => null,
              AssistantMessage: AssistantMessage,
            }}
          />
        </ThreadPrimitive.Viewport>
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
