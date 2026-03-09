import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useModalState, type ModalState } from "../hooks/useModalState";
import { useThreadRuntime, useThread } from "@assistant-ui/react";
import { setSources } from "../api/adapter";
import { ApiKeyForm } from "./ApiKeyForm";
import { SourcesForm } from "./SourcesForm";
import { ProcessingThrobber } from "./ProcessingThrobber";
import { EventStream } from "./EventStream";

export function EnkiModal() {
  const [state, dispatch] = useModalState();
  const threadRuntime = useThreadRuntime();
  const thread = useThread();
  const [expanded, setExpanded] = useState(false);

  const handleApiKeyValid = useCallback(() => {
    dispatch({ type: "API_KEY_VALID" });
  }, [dispatch]);

  const handleProcess = useCallback(
    (sources: string[]) => {
      setSources(sources);
      dispatch({ type: "PROCESS" });
      dispatch({ type: "PROCESSING_DONE" });

      threadRuntime.append({
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze sources: ${sources.join(", ")}`,
          },
        ],
      });
    },
    [dispatch, threadRuntime]
  );

  const handleToggleExpand = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const canExpand = state === "streaming" && !thread.isRunning;
  const isExpanded = canExpand && expanded;
  const sizeClass = `modal--${state}`;

  const modalContent = (
    <div
      className={`modal ${sizeClass}${isExpanded ? " modal--expanded" : ""}`}
      role="dialog"
      aria-label={ariaLabelFor(state)}
    >
      <div className="modal__content">
        <div className="modal__panel modal__panel--entering">
          {state === "apiKey" && (
            <ApiKeyForm onValid={handleApiKeyValid} />
          )}
          {state === "sources" && (
            <SourcesForm onProcess={handleProcess} />
          )}
          {state === "processing" && <ProcessingThrobber />}
          {state === "streaming" && (
            <EventStream
              expanded={expanded}
              onToggleExpand={handleToggleExpand}
            />
          )}
        </div>
      </div>
    </div>
  );

  if (isExpanded) {
    return createPortal(
      <>
        <div className="modal-overlay" onClick={handleToggleExpand} />
        {modalContent}
      </>,
      document.body
    );
  }

  return modalContent;
}

function ariaLabelFor(state: ModalState): string {
  switch (state) {
    case "apiKey":
      return "Enter API key";
    case "sources":
      return "Add sources for analysis";
    case "processing":
      return "Processing sources";
    case "streaming":
      return "Streaming analysis events";
  }
}
