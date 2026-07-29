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
import { createOpenAIProvider } from "./openai-provider"; // kept available for future use

export * from "./types";

let cached: AIProvider | null = null;

/**
 * Wraps the Gemini provider with a secondary Gemini fallback and Mock provider fallback.
 * This ensures that if Gemini Primary hits a quota or network error, the application
 * remains resilient and routes the request to Gemini Fallback, and then Mock.
 */
function createResilientGeminiProvider(env: "PROD" | "DEV"): AIProvider {
  const primary = createGeminiProvider(env);
  
  let secondary: AIProvider | null = null;
  try {
    secondary = createGeminiProvider("FALLBACK");
  } catch {
    console.warn(
      "[AI Resilience] Gemini FALLBACK is not fully configured (missing API key). Secondary fallback will not be possible."
    );
  }

  const tertiary = createMockProvider();

  return {
    id: "gemini", // outwardly behaves as Gemini

    async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
      try {
        return await primary.generateText(input);
      } catch {
        console.warn(
          "[AI Resilience] Primary provider (Gemini) failed to generate text. Rerouting to secondary fallback provider (Gemini FALLBACK)."
        );
        
        if (secondary) {
          try {
            return await secondary.generateText(input);
          } catch {
             console.warn(
              "[AI Resilience] Secondary provider (Gemini FALLBACK) failed. Rerouting to tertiary fallback provider (Mock)."
            );
          }
        } else {
           console.warn(
            "[AI Resilience] Secondary provider not available. Rerouting to tertiary fallback provider (Mock)."
          );
        }
        
        return await tertiary.generateText(input);
      }
    },

    async generateStructuredOutput<T>(
      input: GenerateStructuredInput<T>
    ): Promise<GenerateStructuredOutput<T>> {
      try {
        return await primary.generateStructuredOutput(input);
      } catch {
        if (secondary) {
          try {
            return await secondary.generateStructuredOutput(input);
          } catch {}
        }
        return await tertiary.generateStructuredOutput(input);
      }
    },

    async analyzeImage(input: AnalyzeImageInput): Promise<AnalyzeImageOutput> {
      try {
        return await primary.analyzeImage(input);
      } catch {
         console.warn(
          "[AI Resilience] Primary provider (Gemini) failed to analyze image. Rerouting to secondary fallback provider (Gemini FALLBACK)."
        );
        if (secondary) {
          try {
            return await secondary.analyzeImage(input);
          } catch {
             console.warn(
              "[AI Resilience] Secondary provider (Gemini FALLBACK) failed. Rerouting to tertiary fallback provider (Mock)."
            );
          }
        } else {
           console.warn(
            "[AI Resilience] Secondary provider not available. Rerouting to tertiary fallback provider (Mock)."
          );
        }
        return await tertiary.analyzeImage(input);
      }
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

  const env = process.env.APP_ENV === "development" ? "DEV" : "PROD";
  const requested = process.env.AI_PROVIDER ?? "gemini";

  if (requested === "gemini") {
    cached = createResilientGeminiProvider(env);
  } else if (requested === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    cached = createAnthropicProvider();
  } else {
    cached = createMockProvider();
  }
  
  return cached;
}
