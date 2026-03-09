import { Annotation, MessagesAnnotation } from "@langchain/langgraph";

export const OutlineAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  sources: Annotation<string[]>({ reducer: (_, b) => b, default: () => [] }),
  outline: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  stage: Annotation<string>({ reducer: (_, b) => b, default: () => "init" }),
});

export type OutlineState = typeof OutlineAnnotation.State;
