import OpenAI from "openai";
import type {
  AIProvider,
  AnalyzeImageInput,
  AnalyzeImageOutput,
  GenerateStructuredInput,
  GenerateStructuredOutput,
  GenerateTextInput,
  GenerateTextOutput,
} from "./types";

const DEFAULT_MODEL = "gpt-4o-mini";

export function createOpenAIProvider(env: "PROD" | "DEV" = "PROD"): AIProvider {
  const apiKey = process.env[`OPENAI_API_KEY_${env}`];

  if (!apiKey) {
    throw new Error(
      `OPENAI_API_KEY_${env} environment variable is not set. Please configure it in your server environment.`
    );
  }

  const ai = new OpenAI({ apiKey });

  return {
    id: "openai",

    async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
      try {
        const messages = input.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        const response = await ai.chat.completions.create({
          model: DEFAULT_MODEL,
          messages: [
            { role: "system", content: input.system },
            ...messages,
          ],
          max_tokens: input.maxTokens,
          temperature: 0.7,
        });

        const text = response.choices[0]?.message?.content;

        if (!text) {
          throw new Error("Received empty response from OpenAI API.");
        }

        return { text };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[OpenAI API Error] generateText failed:", msg);
        throw new Error(
          "Failed to connect to the OpenAI provider. Please try again."
        );
      }
    },

    async generateStructuredOutput<T>(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _input: GenerateStructuredInput<T>
    ): Promise<GenerateStructuredOutput<T>> {
      throw new Error(
        "generateStructuredOutput is not yet implemented for the OpenAI provider."
      );
    },

    async analyzeImage(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _input: AnalyzeImageInput
    ): Promise<AnalyzeImageOutput> {
      throw new Error(
        "Image Analysis (Vision) is not yet implemented for the OpenAI provider."
      );
    },
  };
}
