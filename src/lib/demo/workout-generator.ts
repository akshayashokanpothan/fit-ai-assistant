import type {
  Equipment,
  Exercise,
  ExperienceLevel,
  MuscleGroup,
  Profile,
  Workout,
  WorkoutExercise,
} from "@/types";
import { EXERCISE_LIBRARY } from "./seed-exercises";

const HOME_EQUIPMENT: Equipment[] = ["bodyweight", "resistance_band", "dumbbell"];
const GYM_EQUIPMENT: Equipment[] = [
  "bodyweight",
  "dumbbell",
  "barbell",
  "cable",
  "machine",
  "cardio_machine",
  "resistance_band",
];

export type SplitLabel =
  | "Upper Body"
  | "Lower Body"
  | "Full Body"
  | "Push"
  | "Pull"
  | "Legs"
  | "Active Recovery";

const SPLIT_MUSCLES: Record<SplitLabel, MuscleGroup[]> = {
  "Upper Body": ["chest", "back", "shoulders", "biceps", "triceps"],
  "Lower Body": ["quads", "hamstrings", "glutes", "calves"],
  "Full Body": ["chest", "back", "quads", "core", "shoulders"],
  Push: ["chest", "shoulders", "triceps"],
  Pull: ["back", "biceps"],
  Legs: ["quads", "hamstrings", "glutes", "calves"],
  "Active Recovery": ["cardio", "core"],
};

/** Picks a sensible split label given frequency-per-week and a rotation index. */
export function pickSplitForDay(
  frequencyPerWeek: number,
  rotationIndex: number
): SplitLabel {
  if (frequencyPerWeek <= 2) {
    return rotationIndex % 2 === 0 ? "Full Body" : "Full Body";
  }
  if (frequencyPerWeek <= 4) {
    const cycle: SplitLabel[] = ["Upper Body", "Lower Body"];
    return cycle[rotationIndex % cycle.length];
  }
  const cycle: SplitLabel[] = ["Push", "Pull", "Legs"];
  return cycle[rotationIndex % cycle.length];
}

function setsForExperience(exp: ExperienceLevel): number {
  if (exp === "new") return 2;
  if (exp === "beginner") return 3;
  if (exp === "intermediate") return 3;
  return 4;
}

function repRangeForMuscle(muscle: MuscleGroup): [number, number] {
  if (muscle === "cardio") return [0, 0];
  if (["chest", "back", "quads", "hamstrings", "glutes"].includes(muscle)) return [10, 12];
  return [10, 15];
}

export function generateWorkout(
  profile: Profile,
  split: SplitLabel,
  scheduledFor: string,
  excludeExerciseIds: string[] = []
): Workout {
  const equipmentAllowed =
    profile.environment === "home"
      ? HOME_EQUIPMENT
      : profile.environment === "gym"
      ? GYM_EQUIPMENT
      : [...new Set([...HOME_EQUIPMENT, ...GYM_EQUIPMENT])];

  const targetMuscles = SPLIT_MUSCLES[split];
  const experience = profile.experience ?? "beginner";

  let pool: Exercise[] = EXERCISE_LIBRARY.filter(
    (e) =>
      targetMuscles.includes(e.primaryMuscle) &&
      equipmentAllowed.includes(e.equipment) &&
      !excludeExerciseIds.includes(e.id)
  );

  // Respect stated limitations conservatively: avoid loaded knee-heavy moves
  // if user described knee issues, avoid overhead work if shoulder issues.
  const limitation = (profile.limitations ?? "").toLowerCase();
  if (limitation.includes("knee")) {
    pool = pool.filter((e) => !["ex-leg-press", "ex-goblet-squat", "ex-bodyweight-squat"].includes(e.id));
  }
  if (limitation.includes("shoulder")) {
    pool = pool.filter((e) => e.id !== "ex-db-shoulder-press");
  }
  if (limitation.includes("back") || limitation.includes("lower back")) {
    pool = pool.filter((e) => e.id !== "ex-romanian-deadlift");
  }

  const isBeginnerish = experience === "new" || experience === "beginner";
  const exerciseCount = isBeginnerish ? Math.min(5, pool.length) : Math.min(6, pool.length);

  // Spread across distinct primary muscles first, then fill.
  const chosen: Exercise[] = [];
  const seenMuscles = new Set<MuscleGroup>();
  for (const ex of pool) {
    if (chosen.length >= exerciseCount) break;
    if (!seenMuscles.has(ex.primaryMuscle)) {
      chosen.push(ex);
      seenMuscles.add(ex.primaryMuscle);
    }
  }
  for (const ex of pool) {
    if (chosen.length >= exerciseCount) break;
    if (!chosen.includes(ex)) chosen.push(ex);
  }

  const setsPerExercise = setsForExperience(experience);

  const workoutExercises: WorkoutExercise[] = chosen.map((ex, idx) => {
    const [lo, hi] = repRangeForMuscle(ex.primaryMuscle);
    return {
      id: `we-${ex.id}-${idx}`,
      exerciseId: ex.id,
      order: idx,
      plannedSets: Array.from({ length: setsPerExercise }, (_, i) => ({
        setNumber: i + 1,
        targetRepsLow: lo,
        targetRepsHigh: hi,
      })),
    };
  });

  const estimatedMinutes = Math.round(
    workoutExercises.length * setsPerExercise * 2.2 + 8
  );

  return {
    id: `workout-${scheduledFor}-${split.replace(/\s/g, "").toLowerCase()}`,
    userId: profile.userId,
    title: split,
    estimatedMinutes,
    status: "planned",
    scheduledFor,
    exercises: workoutExercises,
    logs: [],
    createdAt: new Date().toISOString(),
  };
}
