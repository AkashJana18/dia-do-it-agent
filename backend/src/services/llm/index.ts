import { buildLlmProvider } from "./openai-compat.js";
import { MockLlmProvider } from "./mock-llm.js";
import type { LlmProvider } from "./types.js";

export function getLlm(): { provider: LlmProvider; model: string; isMock: boolean } {
  const built = buildLlmProvider();
  if (built) return { provider: built.provider, model: built.model, isMock: false };
  return { provider: new MockLlmProvider(), model: "mock", isMock: true };
}
