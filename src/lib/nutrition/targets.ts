import type { Profile } from "@/types";

/**
 * Conservative, non-clinical estimate of a daily calorie and protein target.
 * Uses Mifflin-St Jeor for baseline expenditure, a light activity multiplier,
 * and a modest (never extreme) adjustment for the stated goal.
 *
 * This is presented to users as an estimate, not a prescription.
 */
export function estimateDailyTargets(profile: Profile): {
  kcal: number;
  proteinG: number;
} {
  const { age, sex, heightCm, weightKg, goal } = profile;

  if (!age || !heightCm || !weightKg) {
    // Sensible generic fallback when profile is incomplete.
    return { kcal: 2000, proteinG: 90 };
  }

  const sexOffset = sex === "female" ? -161 : 5;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset;

  // Light-to-moderate activity multiplier — conservative for beginners.
  const maintenance = bmr * 1.4;

  let target = maintenance;
  if (goal === "lose_weight") {
    // Modest ~15% deficit — never an extreme cut.
    target = maintenance * 0.85;
  } else if (goal === "gain_muscle") {
    // Modest ~12% surplus.
    target = maintenance * 1.12;
  }

  // Floor to avoid ever suggesting a dangerously low intake.
  const floor = sex === "female" ? 1400 : 1600;
  target = Math.max(target, floor);

  const proteinPerKg = goal === "gain_muscle" ? 1.8 : goal === "lose_weight" ? 1.6 : 1.4;
  const proteinG = Math.round(weightKg * proteinPerKg);

  return { kcal: Math.round(target / 10) * 10, proteinG };
}
