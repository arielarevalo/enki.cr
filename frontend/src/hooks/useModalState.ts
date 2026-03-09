import { useReducer } from "react";

export type ModalState =
  | "apiKey"
  | "demo"
  | "sources"
  | "processing"
  | "streaming";

type Action =
  | { type: "API_KEY_VALID" }
  | { type: "DEMO_SELECTED" }
  | { type: "PROCESS" }
  | { type: "PROCESSING_DONE" }
  | { type: "BACK_TO_DEMO" }
  | { type: "RESET" };

export function reducer(_state: ModalState, action: Action): ModalState {
  switch (action.type) {
    case "API_KEY_VALID":
      return "demo";
    case "DEMO_SELECTED":
      return "sources";
    case "PROCESS":
      return "processing";
    case "PROCESSING_DONE":
      return "streaming";
    case "BACK_TO_DEMO":
      return "demo";
    case "RESET":
      return "apiKey";
  }
}

export function useModalState() {
  return useReducer(reducer, "apiKey" as ModalState);
}
