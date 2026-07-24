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

function detectIntent(text: string): Intent {
  const t = text.toLowerCase();
  if (/(plan (my )?next|3.?day|three.?day)/.test(t)) return "plan_3day";
  if (
    /(today'?s? workout|what should i (do|train)|workout (today|now)|at the gym)/.test(t) ||
    (t.includes("workout") && (t.includes("today") || t.includes("gym") || t.includes("should")))
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
    const workout =
      context.today.workout ??
      generateWorkout(
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
