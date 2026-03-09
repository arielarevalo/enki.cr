import { useLocalRuntime } from "@assistant-ui/react";
import { mockAdapter } from "../mock/adapter";

export function useEnkiRuntime() {
  return useLocalRuntime(mockAdapter);
}
