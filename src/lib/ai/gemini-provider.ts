import { GoogleGenAI } from "@google/genai";
import type {
  AIProvider,
  AnalyzeImageInput,
  AnalyzeImageOutput,
  GenerateStructuredInput,
  GenerateStructuredOutput,
  GenerateTextInput,
  GenerateTextOutput,
} from "./types";

const DEFAULT_MODEL = "gemini-3.6-flash";

// ─── Gemini native responseSchema definitions ──────────────────────────────────
// These constrain Gemini's output to valid JSON matching Pace's existing
// consumer contracts — eliminating fragile markdown-fence stripping / regex
// extraction that the original prompt-only approach relied on.

/**
 * Schema for meal image analysis.
 * Route /api/ai/analyze-image expects: Array<{ name: string; qty: string }>
 */
const MEAL_ITEMS_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      name: { type: "string" },
      qty: { type: "string" },
    },
    required: ["name", "qty"],
  },
};

/**
 * Schema for activity screenshot analysis.
 * Route /api/ai/analyze-screenshot expects:
 * { steps, distanceKm, activeKcal, durationMin, activityType }
 * All numeric fields are nullable so the model uses null rather than
 * fabricating values it cannot read from the screenshot.
 */
const ACTIVITY_SCHEMA = {
  type: "object",
  properties: {
    steps: { type: "number", nullable: true },
    distanceKm: { type: "number", nullable: true },
    activeKcal: { type: "number", nullable: true },
    durationMin: { type: "number", nullable: true },
    activityType: { type: "string", nullable: true },
  },
  required: ["steps", "distanceKm", "activeKcal", "durationMin", "activityType"],
};

// Supported image MIME types for Gemini Vision.
const SUPPORTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);

// Detect whether this is a screenshot-analysis call (vs meal photo) by
// checking for the sentinel phrase the route already embeds in the instruction.
const SCREENSHOT_INSTRUCTION_SIGNAL = "fitness screenshot";

export function createGeminiProvider(env: "PROD" | "DEV" | "FALLBACK" = "PROD"): AIProvider {
  const apiKey = process.env[`GEMINI_API_KEY_${env}`];

  if (!apiKey) {
    throw new Error(
      `GEMINI_API_KEY_${env} environment variable is not set. Please configure it in your server environment.`
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

    async generateStructuredOutput<T>(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _input: GenerateStructuredInput<T>
    ): Promise<GenerateStructuredOutput<T>> {
      // Reserved for Phase 6D+ — use analyzeImage for vision structured output.
      throw new Error(
        "generateStructuredOutput is not yet implemented for the Gemini provider."
      );
    },

    async analyzeImage(input: AnalyzeImageInput): Promise<AnalyzeImageOutput> {
      // ── 1. Validate MIME type ──────────────────────────────────────────────
      const mime = (input.mediaType || "image/jpeg").toLowerCase();
      if (!SUPPORTED_MIME_TYPES.has(mime)) {
        throw new Error(
          `Unsupported image type "${mime}". Please upload a JPEG, PNG, GIF, or WebP image.`
        );
      }

      // ── 2. Validate Base64 payload (basic sanity) ──────────────────────────
      if (!input.imageBase64 || input.imageBase64.length < 4) {
        throw new Error("Invalid or missing image data.");
      }

      // ── 3. Select schema based on analysis mode ────────────────────────────
      // The existing routes embed a sentinel phrase in the instruction to
      // distinguish screenshot from meal-photo calls. We read that here so
      // there is no need to change the route contracts.
      const isScreenshot = input.instruction
        .toLowerCase()
        .includes(SCREENSHOT_INSTRUCTION_SIGNAL);
      const responseSchema = isScreenshot ? ACTIVITY_SCHEMA : MEAL_ITEMS_SCHEMA;

      try {
        // ── 4. Invoke Gemini Vision with native structured output ─────────────
        // The image is passed as inline base64 data — it is NEVER uploaded to
        // Supabase Storage, written to localStorage, written to disk, or
        // logged. It is discarded by the runtime after this call returns.
        const response = await ai.models.generateContent({
          model: DEFAULT_MODEL,
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: mime,
                    data: input.imageBase64,
                  },
                },
                { text: input.instruction },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema,
            temperature: 0.2, // low temp → deterministic extraction
            maxOutputTokens: 1024,
          },
        });

        // ── 5. Validate the response ──────────────────────────────────────────
        const raw = response.text;
        if (!raw || raw.trim() === "") {
          throw new Error("Gemini returned an empty response for image analysis.");
        }

        // Guard against edge cases where native schema still produces
        // non-parseable output (e.g., quota-exceeded error payloads).
        try {
          JSON.parse(raw);
        } catch {
          throw new Error(
            "Gemini returned a malformed structured response. Please try again."
          );
        }

        // Return as { text } — the existing route handlers parse this JSON
        // themselves, preserving the consumer contract with zero UI changes.
        return { text: raw };
      } catch (err: unknown) {
        // Expose only safe, user-facing error messages. Never expose API key,
        // raw SDK internals, environment values, or Base64 payloads.
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Gemini Vision Error (${env})] analyzeImage failed:`, msg);
        throw new Error(
          "Image analysis failed. Please try a clearer photo or add the entry manually."
        );
      }
    },
  };
}
