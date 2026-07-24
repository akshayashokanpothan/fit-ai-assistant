import type {
  AIProvider,
  AnalyzeImageInput,
  AnalyzeImageOutput,
  GenerateStructuredInput,
  GenerateStructuredOutput,
  GenerateTextInput,
  GenerateTextOutput,
} from "./types";

// A small rotation of plausible Indian meal detections used when no real
// vision provider is configured. Cycled deterministically by a hash of the
// image payload length so repeated demo calls feel varied but stable.
const MOCK_MEAL_DETECTIONS = [
  [
    { name: "Dosa", qty: "2 pieces" },
    { name: "Sambar", qty: "1 bowl" },
    { name: "Coconut chutney", qty: "2 tbsp" },
  ],
  [
    { name: "Rice", qty: "1 cup" },
    { name: "Chicken curry", qty: "1 bowl" },
    { name: "Mixed vegetables", qty: "1 bowl" },
  ],
  [
    { name: "Idli", qty: "3 pieces" },
    { name: "Sambar", qty: "1 bowl" },
    { name: "Coconut chutney", qty: "1 tbsp" },
  ],
  [
    { name: "Chapati", qty: "3 pieces" },
    { name: "Paneer curry", qty: "1 bowl" },
  ],
  [
    { name: "Puttu", qty: "1 cup" },
    { name: "Kadala curry", qty: "1 bowl" },
  ],
  [
    { name: "Biryani", qty: "1 plate" },
  ],
];

const MOCK_SCREENSHOT_DETECTIONS = [
  { steps: 8420, distanceKm: 6.3, activeKcal: 420 },
  { steps: 5230, distanceKm: 3.7, activeKcal: 240 },
  { steps: 11040, distanceKm: 7.9, activeKcal: 540 },
];

function hashLen(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 37) h += s.charCodeAt(i);
  return h;
}

export function createMockProvider(): AIProvider {
  return {
    id: "mock",

    async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
      const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
      const text = mockConversationalReply(lastUser?.content ?? "");
      return { text };
    },

    async generateStructuredOutput<T>(
      input: GenerateStructuredInput<T>
    ): Promise<GenerateStructuredOutput<T>> {
      // Demo mode never needs true structured generation directly — callers
      // that need structured demo data use the dedicated helpers below via
      // analyzeImage/generateText. This still satisfies the interface.
      const data = (input.exampleShape ?? {}) as T;
      return { data, raw: JSON.stringify(data) };
    },

    async analyzeImage(input: AnalyzeImageInput): Promise<AnalyzeImageOutput> {
      if (input.instruction.includes("fitness screenshot")) {
        const pick =
          MOCK_SCREENSHOT_DETECTIONS[
            hashLen(input.imageBase64) % MOCK_SCREENSHOT_DETECTIONS.length
          ];
        return { text: JSON.stringify(pick) };
      }
      const pick =
        MOCK_MEAL_DETECTIONS[hashLen(input.imageBase64) % MOCK_MEAL_DETECTIONS.length];
      return { text: JSON.stringify(pick) };
    },
  };
}

function mockConversationalReply(userText: string): string {
  const t = userText.toLowerCase();

  if (t.includes("workout") && (t.includes("today") || t.includes("gym") || t.includes("do"))) {
    return "Here's today's session — take a look below and start whenever you're ready.";
  }
  if (t.includes("plan") && (t.includes("3 day") || t.includes("next") || t.includes("three"))) {
    return "I've put together the next 3 days for you — workouts, nutrition targets, and meal ideas. You can adjust anything.";
  }
  if (t.includes("eat") || t.includes("meal") || t.includes("food") || t.includes("hungry")) {
    return "Based on what you've logged so far today and your goal, here are a couple of ideas that'll fit your remaining targets.";
  }
  if (t.includes("how am i doing") || t.includes("how did i do") || t.includes("today")) {
    return "Here's where today stands so far.";
  }
  if (t.includes("replace") || t.includes("don't have") || t.includes("swap")) {
    return "Sure — here's a swap that keeps things close to your usual macros.";
  }

  return "Got it — tell me a bit more, or use one of the quick actions below and I'll take it from there.";
}
