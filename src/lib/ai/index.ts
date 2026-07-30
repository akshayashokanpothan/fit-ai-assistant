import type {
  AIProvider,
  AnalyzeImageInput,
  AnalyzeImageOutput,
  GenerateStructuredInput,
  GenerateStructuredOutput,
  GenerateTextInput,
  GenerateTextOutput,
} from "./types";
import { AIProviderClientError } from "./types";
import { createMockProvider } from "./mock-provider";
import { createAnthropicProvider } from "./anthropic-provider";
import { createGeminiProvider } from "./gemini-provider";
// import { createOpenAIProvider } from "./openai-provider"; // kept available for future use

export * from "./types";

let cached: AIProvider | null = null;

/**
 * Wraps the Gemini provider with a secondary Gemini fallback and Mock provider fallback.
 * This ensures that if Gemini Primary hits a quota or network error, the application
 * remains resilient and routes the request to Gemini Fallback, and then Mock.
 */
function createResilientGeminiProvider(env: "PROD" | "DEV"): AIProvider {
  const providers: { name: string; provider: AIProvider }[] = [];
  
  // Discover available keys
  const potentialKeys = [
    `GEMINI_API_KEY_PRIMARY_${env}`,
    `GEMINI_API_KEY_FALLBACK_1_${env}`,
    `GEMINI_API_KEY_FALLBACK_2_${env}`,
    `GEMINI_API_KEY_FALLBACK_3_${env}`,
  ];

  for (const key of potentialKeys) {
    if (process.env[key]) {
      try {
        providers.push({
          name: key,
          provider: createGeminiProvider(key)
        });
      } catch (err) {
        console.warn(`[AI Resilience] Failed to initialize ${key}:`, err);
      }
    }
  }

  if (providers.length === 0) {
    console.warn(`[AI Resilience] No Gemini API keys found for ${env}. Provider will fail instantly.`);
  }

  const tertiary = createMockProvider();

  async function executeWithResilience<T>(
    operation: (provider: AIProvider) => Promise<T>
  ): Promise<T> {
    let lastError: unknown = new Error("No providers available.");

    for (let i = 0; i < providers.length; i++) {
      const { name, provider } = providers[i];
      try {
        if (i === 0) {
          console.log(`[AI Resilience] Attempting Primary Gemini (${name})...`);
        } else {
          console.log(`[AI Resilience] Attempting Fallback ${i} (${name})...`);
        }
        
        const result = await operation(provider);
        
        if (i > 0) {
          console.log(`[AI Resilience] Fallback ${i} succeeded`);
        }
        return result;
      } catch (err) {
        lastError = err;
        
        if (err instanceof AIProviderClientError) {
          console.warn(`[AI Resilience] Provider ${name} returned a Client Error. Short-circuiting fallback chain.`);
          throw err;
        }

        const msg = err instanceof Error ? err.message : String(err);
        if (i === 0) {
          console.warn(`[AI Resilience] Primary failed:`, msg);
        } else {
          console.warn(`[AI Resilience] Fallback ${i} failed:`, msg);
        }
      }
    }

    if (env === "PROD") {
      console.error("[AI Resilience] Fallback chain exhausted. Final failure reason:", 
        lastError instanceof Error ? lastError.message : String(lastError));
      throw lastError;
    }
    
    // DEV fallback to mock
    console.warn("[AI Resilience] All Gemini providers failed in DEV mode. Rerouting to Mock provider.");
    return await operation(tertiary);
  }

  return {
    id: "gemini",

    async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
      return executeWithResilience(p => p.generateText(input));
    },

    async generateStructuredOutput<T>(
      input: GenerateStructuredInput<T>
    ): Promise<GenerateStructuredOutput<T>> {
      return executeWithResilience(p => p.generateStructuredOutput(input));
    },

    async analyzeImage(input: AnalyzeImageInput): Promise<AnalyzeImageOutput> {
      return executeWithResilience(p => p.analyzeImage(input));
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

  const env = process.env.NODE_ENV === "development" ? "DEV" : "PROD";
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
