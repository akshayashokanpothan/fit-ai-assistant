import type {
  AIProvider,
  AnalyzeImageInput,
  AnalyzeImageOutput,
  GenerateStructuredInput,
  GenerateStructuredOutput,
  GenerateTextInput,
  GenerateTextOutput,
} from "./types";

export function createOllamaProvider(): AIProvider {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL ?? "llama3.1";

  return {
    id: "ollama", // Acts as ollama locally

    async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
      try {
        const messages = [
          { role: "system", content: input.system },
          ...input.messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        ];

        const response = await fetch(`${baseUrl}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages,
            stream: false,
            options: {
              temperature: 0.7,
              num_predict: input.maxTokens,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.message?.content) {
          throw new Error("Received empty response from Ollama API.");
        }

        return { text: data.message.content };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[Ollama API Error] generateText failed:", msg);
        throw new Error(
          "Failed to connect to the local Ollama provider. Please ensure Ollama is running."
        );
      }
    },

    async generateStructuredOutput<T>(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _input: GenerateStructuredInput<T>
    ): Promise<GenerateStructuredOutput<T>> {
      throw new Error(
        "generateStructuredOutput is not yet implemented for the Ollama provider."
      );
    },

    async analyzeImage(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _input: AnalyzeImageInput
    ): Promise<AnalyzeImageOutput> {
      throw new Error(
        "Image Analysis (Vision) is not yet implemented for the Ollama provider."
      );
    },
  };
}
