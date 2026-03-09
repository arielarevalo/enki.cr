import { useLocalRuntime } from "@assistant-ui/react";
import { enkiAdapter } from "../api/adapter";

export function useEnkiRuntime() {
  return useLocalRuntime(enkiAdapter);
}
