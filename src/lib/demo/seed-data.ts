import type {
  Activity,
  BodyMetric,
  ChatMessage,
  Conversation,
  Meal,
  Profile,
} from "@/types";
import { findFoodByName, sumNutrition } from "@/lib/nutrition/seed-foods";
import { generateWorkout } from "./workout-generator";
import { subDays, formatISO } from "date-fns";

export const DEMO_USER_ID = "demo-user-1";

export const DEMO_PROFILE: Profile = {
  id: "profile-1",
  userId: DEMO_USER_ID,
  displayName: "Arjun",
  goal: "lose_weight",
  age: 28,
  sex: "male",
  heightCm: 172,
  weightKg: 82,
  experience: "beginner",
  environment: "gym",
  frequencyPerWeek: 4,
  dietPreference: "non_vegetarian",
  dietRestrictions: [],
  limitations: null,
  onboardingCompletedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function buildMeal(
  id: string,
  mealType: Meal["mealType"],
  items: { name: string; qty: string }[],
  hoursAgo: number
): Meal {
  const mealItems = items.map((it, idx) => {
    const food = findFoodByName(it.name);
    const nutrition = food?.perUnit ?? { kcal: 150, proteinG: 5, carbsG: 20, fatG: 4 };
    return {
      id: `${id}-item-${idx}`,
      name: food?.name ?? it.name,
      quantityLabel: it.qty,
      nutrition,
      confidence: 0.78,
    };
  });
  return {
    id,
    userId: DEMO_USER_ID,
    mealType,
    eventTime: new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString(),
    items: mealItems,
    totalNutrition: sumNutrition(mealItems.map((i) => i.nutrition)),
    source: "image_ai",
    confidence: 0.78,
    confirmationState: "confirmed",
    createdAt: new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString(),
  };
}

export const DEMO_TODAY_MEALS: Meal[] = [
  buildMeal(
    "meal-today-breakfast",
    "breakfast",
    [
      { name: "Dosa", qty: "2 pieces" },
      { name: "Sambar", qty: "1 bowl" },
      { name: "Coconut chutney", qty: "2 tbsp" },
    ],
    6
  ),
  buildMeal(
    "meal-today-lunch",
    "lunch",
    [
      { name: "Rice", qty: "1 cup" },
      { name: "Chicken curry", qty: "1 bowl" },
      { name: "Mixed vegetables", qty: "1 bowl" },
    ],
    2
  ),
];

export const DEMO_TODAY_ACTIVITY: Activity[] = [
  {
    id: "activity-today-1",
    userId: DEMO_USER_ID,
    source: "screenshot_ai",
    activityType: "steps",
    steps: 6840,
    distanceKm: 4.9,
    activeKcal: 265,
    eventDate: formatISO(new Date(), { representation: "date" }),
    confidence: 0.85,
    confirmationState: "confirmed",
    createdAt: new Date().toISOString(),
  },
];

export const DEMO_TODAY_WORKOUT = generateWorkout(
  DEMO_PROFILE,
  { kind: "split", split: "Upper Body" },
  formatISO(new Date(), { representation: "date" })
);

// ── History (previous days) ──────────────────────────────────────────────

export const DEMO_HISTORY_MEALS: Meal[] = [
  buildMeal(
    "meal-y1-breakfast",
    "breakfast",
    [{ name: "Idli", qty: "3 pieces" }, { name: "Sambar", qty: "1 bowl" }],
    30
  ),
  buildMeal(
    "meal-y1-lunch",
    "lunch",
    [{ name: "Rice", qty: "1 cup" }, { name: "Fish curry", qty: "1 bowl" }, { name: "Thoran", qty: "1 bowl" }],
    26
  ),
  buildMeal(
    "meal-y1-dinner",
    "dinner",
    [{ name: "Chapati", qty: "3 pieces" }, { name: "Paneer curry", qty: "1 bowl" }],
    18
  ),
];

export const DEMO_HISTORY_ACTIVITY: Activity[] = [
  {
    id: "activity-y1",
    userId: DEMO_USER_ID,
    source: "screenshot_ai",
    activityType: "steps",
    steps: 8420,
    distanceKm: 6.3,
    activeKcal: 420,
    eventDate: formatISO(subDays(new Date(), 1), { representation: "date" }),
    confidence: 0.85,
    confirmationState: "confirmed",
    createdAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
  },
];

export const DEMO_HISTORY_WORKOUT = {
  ...generateWorkout(
    DEMO_PROFILE,
    { kind: "split", split: "Lower Body" },
    formatISO(subDays(new Date(), 1), { representation: "date" })
  ),
  status: "completed" as const,
  startedAt: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
  completedAt: new Date(Date.now() - 24.2 * 3600 * 1000).toISOString(),
  perceivedDifficulty: "moderate" as const,
};

export const DEMO_BODY_METRICS: BodyMetric[] = [
  { id: "bm-1", userId: DEMO_USER_ID, weightKg: 84, recordedAt: subDays(new Date(), 21).toISOString() },
  { id: "bm-2", userId: DEMO_USER_ID, weightKg: 83.2, recordedAt: subDays(new Date(), 14).toISOString() },
  { id: "bm-3", userId: DEMO_USER_ID, weightKg: 82.6, recordedAt: subDays(new Date(), 7).toISOString() },
  { id: "bm-4", userId: DEMO_USER_ID, weightKg: 82, recordedAt: new Date().toISOString() },
];

export const DEMO_CONVERSATION: Conversation = {
  id: "conv-1",
  userId: DEMO_USER_ID,
  title: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const DEMO_MESSAGES: ChatMessage[] = [
  {
    id: "msg-welcome",
    conversationId: "conv-1",
    role: "assistant",
    // No name here deliberately — the AI page renders this specific
    // message with a personalized greeting derived from the authenticated
    // Supabase profile (see WELCOME_MESSAGE_ID in src/app/(app)/ai/page.tsx).
    // This stays as the safe fallback if that ever isn't available.
    content:
      "Good to see you. I've got today's breakfast and lunch logged, plus your step count. Want to plan today's workout, or check in on how the day's going?",
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
];
