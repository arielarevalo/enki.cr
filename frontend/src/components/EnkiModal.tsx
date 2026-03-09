import { useCallback, useState } from "react";
import { useModalState, type ModalState } from "../hooks/useModalState";
import { useThreadRuntime, useThread } from "@assistant-ui/react";
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
      dispatch({ type: "PROCESS" });

      // Simulate processing delay, then start streaming
      setTimeout(() => {
        dispatch({ type: "PROCESSING_DONE" });

        // Send a message to kick off the mock adapter
        threadRuntime.append({
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze sources: ${sources.join(", ")}`,
            },
          ],
        });
      }, 2000);
    },
    [dispatch, threadRuntime]
  );

  const handleToggleExpand = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const canExpand = state === "streaming" && !thread.isRunning;
  const sizeClass = `modal--${state}`;
  const expandedClass = canExpand && expanded ? " modal--expanded" : "";

  return (
    <>
      {canExpand && expanded && (
        <div className="modal-overlay" onClick={handleToggleExpand} />
      )}
      <div
        className={`modal ${sizeClass}${expandedClass}`}
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
    </>
  );
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
