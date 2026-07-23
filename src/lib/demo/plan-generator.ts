import type { Plan, PlanDay, Profile } from "@/types";
import { estimateDailyTargets } from "@/lib/nutrition/targets";
import { pickSplitForDay } from "./workout-generator";
import { addDays, formatISO } from "date-fns";

const VEG_MEALS = [
  "Curd rice with avial",
  "Chapati with paneer curry and mixed vegetables",
  "Puttu with kadala curry",
  "Rice, dal and thoran",
];
const NONVEG_MEALS = [
  "Rice with fish curry and thoran",
  "Chapati with chicken curry",
  "Idiyappam with egg curry",
  "Rice, sambar and boiled eggs",
];
const VEGAN_MEALS = [
  "Rice, dal and avial (no ghee)",
  "Chapati with mixed vegetable curry",
  "Puttu with kadala curry (coconut oil)",
];
const EGG_MEALS = [
  "Boiled eggs with chapati and vegetables",
  "Egg curry with rice",
  "Idli with sambar and a boiled egg",
];

function mealSuggestionsFor(profile: Profile): string[] {
  switch (profile.dietPreference) {
    case "vegan":
      return VEGAN_MEALS;
    case "vegetarian":
      return VEG_MEALS;
    case "eggetarian":
      return EGG_MEALS;
    case "non_vegetarian":
    default:
      return NONVEG_MEALS;
  }
}

export function generateThreeDayPlan(profile: Profile, rotationStart = 0): Plan {
  const { kcal, proteinG } = estimateDailyTargets(profile);
  const meals = mealSuggestionsFor(profile);
  const frequency = profile.frequencyPerWeek ?? 3;

  const days: PlanDay[] = Array.from({ length: 3 }, (_, i) => {
    const date = formatISO(addDays(new Date(), i), { representation: "date" });
    // Every 3rd day slot is recovery for lower frequencies to keep it beginner-safe.
    const isRecoveryDay = frequency <= 3 ? i === 2 : i === 3 % 3 && false;
    const split = isRecoveryDay ? null : pickSplitForDay(frequency, rotationStart + i);

    return {
      dayIndex: i,
      date,
      workoutTitle: split,
      nutritionTargetKcal: kcal,
      proteinTargetG: proteinG,
      mealSuggestions: [meals[i % meals.length], meals[(i + 1) % meals.length]],
      activityGuidance: isRecoveryDay
        ? "Light walk (20–30 min) or mobility stretching."
        : "Aim for a relaxed walk if time allows, on top of today's session.",
      completed: false,
    };
  });

  return {
    id: `plan-${Date.now()}`,
    userId: profile.userId,
    createdAt: new Date().toISOString(),
    days,
    status: "active",
  };
}
