import type { MuscleGroup } from "@/types";
import type { SplitLabel } from "./workout-generator";

/**
 * What the user explicitly asked to train, if anything — extracted
 * deterministically from their message text. Kept intentionally small:
 * either a named split (reusing the existing SplitLabel/SPLIT_MUSCLES
 * mapping), an explicit muscle-group combination, or no preference at all
 * (in which case the caller falls back to automatic rotation).
 */
export type RequestedWorkoutFocus =
  | { kind: "split"; split: SplitLabel }
  | { kind: "muscles"; muscles: MuscleGroup[]; label: string }
  | { kind: "none" };

/**
 * What `generateWorkout` actually operates on — always a concrete focus.
 * Callers resolve `{ kind: "none" }` (no explicit request) down to the
 * automatic rotation's split *before* calling generateWorkout, so "no
 * preference" is never a state the generator itself needs to handle.
 */
export type ResolvedWorkoutFocus = Exclude<RequestedWorkoutFocus, { kind: "none" }>;

// Named splits/rotations — checked first since they're more specific than a
// single muscle mention, and already map cleanly onto the exercise
// library's existing SplitLabel/SPLIT_MUSCLES (no new categories invented).
const SPLIT_KEYWORDS: { pattern: RegExp; split: SplitLabel }[] = [
  { pattern: /\bupper[\s-]?body\b/, split: "Upper Body" },
  { pattern: /\blower[\s-]?body\b/, split: "Lower Body" },
  { pattern: /\bfull[\s-]?body\b/, split: "Full Body" },
  { pattern: /\bpush\b/, split: "Push" },
  { pattern: /\bpull\b/, split: "Pull" },
  { pattern: /\blegs?\b/, split: "Legs" },
];

// Individual muscle-group mentions — only reached if no named split matched.
// Each maps to muscle groups that already exist in the exercise library
// (src/lib/demo/seed-exercises.ts); "arms" is the one compound shorthand,
// mapped to its two constituent, already-supported groups.
const MUSCLE_KEYWORDS: { pattern: RegExp; muscles: MuscleGroup[]; label: string }[] = [
  { pattern: /\bchest\b/, muscles: ["chest"], label: "Chest" },
  { pattern: /\bback\b/, muscles: ["back"], label: "Back" },
  { pattern: /\bshoulders?\b/, muscles: ["shoulders"], label: "Shoulders" },
  { pattern: /\btriceps?\b/, muscles: ["triceps"], label: "Triceps" },
  { pattern: /\bbiceps?\b/, muscles: ["biceps"], label: "Biceps" },
  { pattern: /\barms?\b/, muscles: ["biceps", "triceps"], label: "Arms" },
  { pattern: /\bquads?\b/, muscles: ["quads"], label: "Quads" },
  { pattern: /\bhamstrings?\b/, muscles: ["hamstrings"], label: "Hamstrings" },
  { pattern: /\bglutes?\b/, muscles: ["glutes"], label: "Glutes" },
  { pattern: /\b(calves|calf)\b/, muscles: ["calves"], label: "Calves" },
  { pattern: /\b(core|abs|abdominals?)\b/, muscles: ["core"], label: "Core" },
];

export function extractRequestedFocus(text: string): RequestedWorkoutFocus {
  const t = text.toLowerCase();

  for (const { pattern, split } of SPLIT_KEYWORDS) {
    if (pattern.test(t)) return { kind: "split", split };
  }

  const matchedMuscles = new Set<MuscleGroup>();
  const labels: string[] = [];
  for (const { pattern, muscles, label } of MUSCLE_KEYWORDS) {
    if (pattern.test(t)) {
      for (const m of muscles) matchedMuscles.add(m);
      if (!labels.includes(label)) labels.push(label);
    }
  }

  if (matchedMuscles.size > 0) {
    return { kind: "muscles", muscles: [...matchedMuscles], label: labels.join(" & ") };
  }

  return { kind: "none" };
}
