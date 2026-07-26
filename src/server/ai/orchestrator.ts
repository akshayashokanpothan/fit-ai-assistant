import type { AIContext, StructuredCard } from "@/types";
import { getAIProvider } from "@/lib/ai";
import { checkSafety } from "./safety";
import { generateWorkout, pickSplitForDay } from "@/lib/demo/workout-generator";
import { generateThreeDayPlan } from "@/lib/demo/plan-generator";
import { formatISO } from "date-fns";

type Intent =
  | "workout_today"
  | "plan_3day"
  | "today_summary"
  | "meal_suggestion"
  | "general";

// Broad, general workout-intent signals — deliberately not tied to any one
// exact phrasing. Mentioning a workout/training verb, or a creation verb
// alongside a muscle-group/split name, is a strong enough signal on its own
// in a fitness app context; the downside of a rare false positive is just
// showing a workout card, not anything harmful.
const WORKOUT_VERBS = /\b(workout|work ?out|exercise|train(ing)?|gym session)\b/;
const CREATION_VERBS = /\b(create|give me|make me|build me|generate|design|suggest|recommend)\b/;
const MUSCLE_OR_SPLIT =
  /\b(upper body|lower body|full body|push|pull|legs?|chest|back|shoulders?|biceps?|triceps?|glutes?|core|cardio|arms?)\b/;

// Within the broader workout_today intent, a narrow, explicit set of
// "show me what I already have" phrasings — deliberately tight (requires an
// actual retrieval/query structure, not just any sentence mentioning
// "today's workout") so a generation request like "Plan today's workout" or
// "Create an upper-body workout" doesn't get misclassified as retrieval.
const WORKOUT_RETRIEVAL_PHRASES =
  /\b(what'?s my workout|what is my workout|show me (my |today'?s )?workout|what workout (do i have|is (scheduled|planned|for today))|do i have a workout)\b/;

function detectIntent(text: string): Intent {
  const t = text.toLowerCase();
  if (/(plan (my )?next|3.?day|three.?day)/.test(t)) return "plan_3day";
  if (
    /(today'?s? workout|what should i (do|train)|workout (today|now)|at the gym)/.test(t) ||
    WORKOUT_VERBS.test(t) ||
    (CREATION_VERBS.test(t) && MUSCLE_OR_SPLIT.test(t))
  )
    return "workout_today";
  if (/(how am i doing|how did i do|summary|recap)/.test(t)) return "today_summary";
  if (/(what should i eat|eat today|meal (plan|idea)|hungry|replace|don'?t have|swap)/.test(t))
    return "meal_suggestion";
  return "general";
}

function buildSystemPrompt(context: AIContext): string {
  const { profile, goalTargets, today, recentWorkouts, currentPlan, derivedMemory } = context;

  const derivedLines = derivedMemory
    .slice(0, 6)
    .map((m) => `- ${m.key}: ${m.value}`)
    .join("\n");

  return `You are Pace AI, a calm, encouraging AI fitness companion for beginners in India. You are NOT a doctor. You never diagnose, prescribe medication, or claim medical clearance. Keep replies short (2-4 sentences), warm, plain-spoken, non-judgmental, and specific to the data below. Never tell the user they need to "burn off" what they ate. Always present nutrition/activity numbers as estimates.

User profile:
- Goal: ${profile.goal ?? "not set"}
- Experience: ${profile.experience ?? "not set"}
- Environment: ${profile.environment ?? "not set"}
- Training frequency: ${profile.frequencyPerWeek ?? "not set"} days/week
- Diet preference: ${profile.dietPreference ?? "not set"}
- Limitations: ${profile.limitations ?? "none noted"}
- Daily target: ~${goalTargets.kcal} kcal, ${goalTargets.proteinG}g protein (estimate)

Today so far:
- Meals logged: ${today.meals.length} (${today.nutrition.kcal} kcal, ${today.nutrition.proteinG}g protein so far)
- Activity: ${today.activities.map((a) => `${a.steps ?? 0} steps`).join(", ") || "none logged"}
- Workout: ${today.workout ? `${today.workout.title} (${today.workout.status})` : "none planned yet"}

Recent workouts: ${recentWorkouts.map((w) => w.title).join(", ") || "none"}
Current plan: ${currentPlan ? "active 3-day plan in place" : "no active plan"}
${derivedLines ? `\nObserved patterns (use only as soft context, never override explicit profile data):\n${derivedLines}` : ""}`;
}

export interface OrchestratorResult {
  reply: string;
  card?: StructuredCard;
}

export async function handleChatMessage(
  userMessage: string,
  context: AIContext,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<OrchestratorResult> {
  const safety = checkSafety(userMessage);
  if (safety.category !== "none") {
    return {
      reply: safety.message,
      card: { kind: "safety_notice", data: { category: safety.category } },
    };
  }

  const provider = getAIProvider();
  const intent = detectIntent(userMessage);
  const system = buildSystemPrompt(context);

  if (intent === "workout_today") {
    const today = formatISO(new Date(), { representation: "date" });
    // Only reuse an already-scheduled workout for a "show me what I have"
    // style request. An explicit generation request ("Create an
    // upper-body workout", "Give me a leg workout", etc.) always generates
    // fresh from the real profile, even if one is already scheduled today.
    const isRetrieval = WORKOUT_RETRIEVAL_PHRASES.test(userMessage.toLowerCase());
    const workout =
      isRetrieval && context.today.workout
        ? context.today.workout
        : generateWorkout(
            context.profile,
            pickSplitForDay(context.profile.frequencyPerWeek ?? 3, context.recentWorkouts.length),
            today
          );
    const { text } = await provider.generateText({
      system,
      messages: [...history, { role: "user", content: userMessage }],
      maxTokens: 200,
    });
    return { reply: text, card: { kind: "workout_preview", data: workout } };
  }

  if (intent === "plan_3day") {
    const plan = generateThreeDayPlan(context.profile, context.recentWorkouts.length);
    const { text } = await provider.generateText({
      system,
      messages: [...history, { role: "user", content: userMessage }],
      maxTokens: 200,
    });
    return { reply: text, card: { kind: "plan_preview", data: plan } };
  }

  if (intent === "today_summary") {
    const { text } = await provider.generateText({
      system,
      messages: [...history, { role: "user", content: userMessage }],
      maxTokens: 200,
    });
    return { reply: text, card: { kind: "today_summary", data: context.today } };
  }

  const { text } = await provider.generateText({
    system,
    messages: [...history, { role: "user", content: userMessage }],
    maxTokens: 250,
  });
  return { reply: text };
}
