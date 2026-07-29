import { GoogleGenAI } from "@google/genai";
import type {
  AIProvider,
  AnalyzeImageOutput,
  GenerateStructuredOutput,
  GenerateTextInput,
  GenerateTextOutput,
} from "./types";

const DEFAULT_MODEL = "gemini-2.5-flash";

export function createGeminiProvider(): AIProvider {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not set. Please configure it in your server environment."
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  return {
    id: "gemini",

    async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
      try {
        const contents = input.messages.map((msg) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        }));

        const response = await ai.models.generateContent({
          model: DEFAULT_MODEL,
          contents,
          config: {
            systemInstruction: input.system,
            maxOutputTokens: input.maxTokens,
            temperature: 0.7,
          },
        });

        if (!response.text) {
          throw new Error("Received empty response from Gemini API.");
        }

        return { text: response.text };
      } catch (err: unknown) {
        console.error("[Gemini API Error] generateText failed:", err);
        throw new Error(
          "Failed to connect to the Gemini provider. Please try again."
        );
      }
    },

    async generateStructuredOutput<T>(): Promise<GenerateStructuredOutput<T>> {
      throw new Error(
        "Structured Output is not implemented for Gemini in Phase 6B."
      );
    },

    async analyzeImage(): Promise<AnalyzeImageOutput> {
      throw new Error(
        "Image Analysis (Vision) is not implemented for Gemini in Phase 6B."
      );
    },
  };
}
