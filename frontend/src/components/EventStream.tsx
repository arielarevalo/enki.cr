import {
  ThreadPrimitive,
  MessagePrimitive,
} from "@assistant-ui/react";

interface Props {
  onComplete: () => void;
}

export function EventStream({ onComplete }: Props) {
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
      <div className="sources-form__footer">
        <button
          type="button"
          className="modal__btn"
          style={{ width: "100%" }}
          onClick={onComplete}
        >
          View Result
        </button>
      </div>
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
