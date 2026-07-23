import type { AIProvider } from "./types";
import { createMockProvider } from "./mock-provider";
import { createAnthropicProvider } from "./anthropic-provider";

export * from "./types";

let cached: AIProvider | null = null;

/**
 * Provider factory. Selection is environment-based:
 *  - AI_PROVIDER=anthropic (+ ANTHROPIC_API_KEY) -> real Anthropic adapter
 *  - anything else / missing credentials         -> deterministic mock
 *
 * Additional adapters (OpenAI, Gemini) can be added here behind the same
 * AIProvider interface without touching orchestration or UI code.
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached;

  const requested = process.env.AI_PROVIDER ?? "mock";

  if (requested === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    cached = createAnthropicProvider();
  } else {
    cached = createMockProvider();
  }
  return cached;
}
