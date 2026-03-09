import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useEnkiRuntime } from "./runtime/setup";
import { EnkiModal } from "./components/EnkiModal";

export function App() {
  const runtime = useEnkiRuntime();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <EnkiModal />
    </AssistantRuntimeProvider>
  );
}
