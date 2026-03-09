import { useReducer } from "react";

export type ModalState =
  | "apiKey"
  | "sources"
  | "processing"
  | "streaming";

type Action =
  | { type: "API_KEY_VALID" }
  | { type: "PROCESS" }
  | { type: "PROCESSING_DONE" }
  | { type: "RESET" };

function reducer(_state: ModalState, action: Action): ModalState {
  switch (action.type) {
    case "API_KEY_VALID":
      return "sources";
    case "PROCESS":
      return "processing";
    case "PROCESSING_DONE":
      return "streaming";
    case "RESET":
      return "apiKey";
  }
}

export function useModalState() {
  return useReducer(reducer, "apiKey" as ModalState);
}
