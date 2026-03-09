import { useCallback, useState } from "react";
import { useModalState, type ModalState } from "../hooks/useModalState";
import { useThreadRuntime } from "@assistant-ui/react";
import { ApiKeyForm } from "./ApiKeyForm";
import { SourcesForm } from "./SourcesForm";
import { ProcessingThrobber } from "./ProcessingThrobber";
import { EventStream } from "./EventStream";
import { FinalResult } from "./FinalResult";

export function EnkiModal() {
  const [state, dispatch] = useModalState();
  const [expanded, setExpanded] = useState(false);
  const threadRuntime = useThreadRuntime();

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

  const handleStreamComplete = useCallback(() => {
    dispatch({ type: "STREAMING_DONE" });
  }, [dispatch]);

  const handleToggleExpand = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const sizeClass = `modal--${state}`;
  const expandedClass = expanded && state === "result" ? " modal--expanded" : "";

  return (
    <>
      {expanded && state === "result" && (
        <div className="modal-overlay" onClick={handleToggleExpand} />
      )}
      <div
        className={`modal ${sizeClass}${expandedClass}`}
        role="dialog"
        aria-label={ariaLabelFor(state)}
      >
        <div className="modal__content">
          <div className="modal__panel modal__panel--entering" key={state}>
            {state === "apiKey" && (
              <ApiKeyForm onValid={handleApiKeyValid} />
            )}
            {state === "sources" && (
              <SourcesForm onProcess={handleProcess} />
            )}
            {state === "processing" && <ProcessingThrobber />}
            {state === "streaming" && (
              <EventStream onComplete={handleStreamComplete} />
            )}
            {state === "result" && (
              <FinalResult
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
    case "result":
      return "Analysis result";
  }
}
