import type {
  AIProvider,
  AnalyzeImageInput,
  AnalyzeImageOutput,
  GenerateStructuredInput,
  GenerateStructuredOutput,
  GenerateTextInput,
  GenerateTextOutput,
} from "./types";
import { createMockProvider } from "./mock-provider";
import { createAnthropicProvider } from "./anthropic-provider";
import { createGeminiProvider } from "./gemini-provider";
import { createOpenAIProvider } from "./openai-provider";

export * from "./types";

let cached: AIProvider | null = null;

/**
 * Wraps the Gemini provider with an OpenAI fallback for text generation.
 * This ensures that if Gemini hits a quota or network error, the application
 * remains resilient and routes the request to gpt-4o-mini instead.
 * Vision and structured outputs do not currently have fallback targets.
 */
function createResilientGeminiProvider(): AIProvider {
  const primary = createGeminiProvider();
  let fallback: AIProvider | null = null;

  try {
    fallback = createOpenAIProvider();
  } catch {
    console.warn(
      "[AI Resilience] OpenAI fallback is not fully configured (missing API key). Fallback will not be possible."
    );
  }

  return {
    id: "gemini", // outwardly behaves as Gemini

    async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
      try {
        return await primary.generateText(input);
      } catch (err) {
        if (!fallback) {
          throw err;
        }
        
        // Log the failure safely server-side without exposing API keys or user content
        console.warn(
          "[AI Resilience] Primary provider (Gemini) failed to generate text. Rerouting to fallback provider (OpenAI gpt-4o-mini)."
        );
        
        // The fallback provider internally catches its own errors and normalizes them,
        // so we can simply await and return it directly.
        return await fallback.generateText(input);
      }
    },

    async generateStructuredOutput<T>(
      input: GenerateStructuredInput<T>
    ): Promise<GenerateStructuredOutput<T>> {
      return await primary.generateStructuredOutput(input);
    },

    async analyzeImage(input: AnalyzeImageInput): Promise<AnalyzeImageOutput> {
      return await primary.analyzeImage(input);
    },
  };
}

/**
 * Provider factory. Selection is environment-based:
 *  - AI_PROVIDER=gemini -> Gemini (Primary) with OpenAI (Fallback)
 *  - AI_PROVIDER=anthropic (+ ANTHROPIC_API_KEY) -> real Anthropic adapter
 *  - anything else / missing credentials -> deterministic mock
 *
 * Additional adapters can be added here behind the same AIProvider interface
 * without touching orchestration or UI code.
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached;

  const requested = process.env.AI_PROVIDER ?? "mock";

  if (requested === "gemini") {
    cached = createResilientGeminiProvider();
  } else if (requested === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    cached = createAnthropicProvider();
  } else {
    cached = createMockProvider();
  }
  
  return cached;
}
