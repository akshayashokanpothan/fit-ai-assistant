import type {
  AIProvider,
  AnalyzeImageInput,
  AnalyzeImageOutput,
  GenerateStructuredInput,
  GenerateStructuredOutput,
  GenerateTextInput,
  GenerateTextOutput,
} from "./types";

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

async function callMessages(body: Record<string, unknown>) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured on the server.");
  }
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: DEFAULT_MODEL, max_tokens: 1024, ...body }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Anthropic API error ${res.status}: ${errText}`);
  }
  return res.json();
}

function extractText(data: { content?: { type: string; text?: string }[] }): string {
  return (data.content ?? [])
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("\n");
}

/**
 * Real Anthropic adapter. Only used when ANTHROPIC_API_KEY is present in the
 * server environment — the provider factory falls back to the mock provider
 * otherwise, so the app is always explorable.
 */
export function createAnthropicProvider(): AIProvider {
  return {
    id: "anthropic",

    async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
      const data = await callMessages({
        system: input.system,
        messages: input.messages,
        max_tokens: input.maxTokens ?? 1024,
      });
      return { text: extractText(data) };
    },

    async generateStructuredOutput<T>(
      input: GenerateStructuredInput<T>
    ): Promise<GenerateStructuredOutput<T>> {
      const system = `${input.system}\n\nRespond with ONLY valid JSON matching this shape, no prose, no markdown fences:\n${input.schemaDescription}`;
      const data = await callMessages({
        system,
        messages: [{ role: "user", content: input.prompt }],
        max_tokens: 1024,
      });
      const raw = extractText(data).trim();
      const cleaned = raw.replace(/^```json\s*|\s*```$/g, "");
      let parsed: T;
      try {
        parsed = JSON.parse(cleaned) as T;
      } catch {
        throw new Error("Model did not return valid JSON for structured output.");
      }
      return { data: parsed, raw: cleaned };
    },

    async analyzeImage(input: AnalyzeImageInput): Promise<AnalyzeImageOutput> {
      const data = await callMessages({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: input.mediaType,
                  data: input.imageBase64,
                },
              },
              { type: "text", text: input.instruction },
            ],
          },
        ],
        max_tokens: 800,
      });
      return { text: extractText(data) };
    },
  };
}
