import { ChatOpenAI } from "@langchain/openai";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "anthropic/claude-sonnet-4";

export function createLLM(
  apiKey: string,
  model: string = DEFAULT_MODEL,
): ChatOpenAI {
  return new ChatOpenAI({
    modelName: model,
    configuration: {
      baseURL: OPENROUTER_BASE_URL,
      apiKey,
    },
    streaming: true,
  });
}
