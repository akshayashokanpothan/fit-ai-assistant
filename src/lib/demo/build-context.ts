import type { AIContext, Activity, Meal, Plan, Profile, Workout, BodyMetric, MemoryFact } from "@/types";
import { estimateDailyTargets } from "@/lib/nutrition/targets";
import { formatISO } from "date-fns";

/**
 * Retrieves only the relevant slice of state to send to the AI provider —
 * never the full store. Keeps payloads small and predictable.
 *
 * `profile` is passed separately from `state` deliberately: it must come
 * from the authenticated Supabase profile (see `useProfile()` /
 * `src/lib/profile/profile-context.tsx`), not the demo store — meals,
 * activities, workouts, plans, body metrics, and derived memory remain
 * demo-store-backed until a later phase migrates them too.
 */
export function buildAIContext(
  profile: Profile,
  state: {
    activities: Activity[];
    plans: Plan[];
    bodyMetrics: BodyMetric[];
    derivedMemory: MemoryFact[];
  },
  workouts: Workout[],
  meals: Meal[]
): AIContext {
  const today = formatISO(new Date(), { representation: "date" });
  const goalTargets = estimateDailyTargets(profile);

  const todaysMeals = meals.filter(
    (m) => m.eventTime.slice(0, 10) === today && m.confirmationState === "confirmed"
  );
  const todaysActivities = state.activities.filter((a) => a.eventDate === today);
  const todaysWorkout = workouts.find((w) => w.scheduledFor === today) ?? null;

  const nutritionTotals = todaysMeals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.totalNutrition.kcal,
      proteinG: acc.proteinG + m.totalNutrition.proteinG,
      carbsG: acc.carbsG + m.totalNutrition.carbsG,
      fatG: acc.fatG + m.totalNutrition.fatG,
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );

  const recentWorkouts = [...workouts]
    .filter((w) => w.status === "completed")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
    .slice(0, 5);

  const recentMeals = [...meals]
    .filter((m) => m.confirmationState === "confirmed")
    .sort((a, b) => b.eventTime.localeCompare(a.eventTime))
    .slice(0, 10);

  const currentPlan = state.plans.find((p) => p.status === "active") ?? null;

  return {
    profile,
    goalTargets,
    today: {
      meals: todaysMeals,
      activities: todaysActivities,
      workout: todaysWorkout,
      nutrition: {
        date: today,
        kcal: Math.round(nutritionTotals.kcal),
        proteinG: Math.round(nutritionTotals.proteinG),
        carbsG: Math.round(nutritionTotals.carbsG),
        fatG: Math.round(nutritionTotals.fatG),
        targetKcal: goalTargets.kcal,
        targetProteinG: goalTargets.proteinG,
      },
    },
    recentWorkouts,
    recentMeals,
    currentPlan,
    recentBodyMetrics: state.bodyMetrics.slice(-5),
    derivedMemory: state.derivedMemory,
  };
}
