import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  LoggedSet,
  PlannedSet,
  Workout,
  WorkoutExercise,
  WorkoutSetLog,
  WorkoutStatus,
} from "@/types";

// ── Row shapes (snake_case, mirrors supabase/migrations/0001_init.sql +
// 0002_phase5b_schema_adjustments.sql) ──────────────────────────────────

interface WorkoutSetRow {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  completed: boolean;
  skipped: boolean;
  note: string | null;
}

interface WorkoutExerciseRow {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
  planned_sets: PlannedSet[];
  skipped: boolean;
  workout_sets?: WorkoutSetRow[];
}

interface WorkoutRow {
  id: string;
  user_id: string;
  title: string;
  estimated_minutes: number;
  status: WorkoutStatus;
  scheduled_for: string;
  started_at: string | null;
  completed_at: string | null;
  perceived_difficulty: Workout["perceivedDifficulty"] | null;
  note: string | null;
  created_at: string;
  workout_exercises?: WorkoutExerciseRow[];
}

const WORKOUT_SELECT = "*, workout_exercises(*, workout_sets(*))";

function rowToWorkout(row: WorkoutRow): Workout {
  const weRows = [...(row.workout_exercises ?? [])].sort(
    (a, b) => a.order_index - b.order_index
  );

  const exercises: WorkoutExercise[] = weRows.map((we) => ({
    id: we.id,
    exerciseId: we.exercise_id,
    order: we.order_index,
    plannedSets: we.planned_sets,
  }));

  const logs: WorkoutSetLog[] = weRows.map((we) => {
    const sets: LoggedSet[] = [...(we.workout_sets ?? [])]
      .sort((a, b) => a.set_number - b.set_number)
      .map((s) => ({
        setNumber: s.set_number,
        weightKg: s.weight_kg,
        reps: s.reps,
        completed: s.completed,
        skipped: s.skipped,
        note: s.note ?? undefined,
      }));
    return { workoutExerciseId: we.id, sets, skippedExercise: we.skipped };
  });

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    estimatedMinutes: row.estimated_minutes,
    status: row.status,
    scheduledFor: row.scheduled_for,
    exercises,
    logs,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    perceivedDifficulty: row.perceived_difficulty ?? undefined,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

/**
 * Persists a client-generated Workout (from generateWorkout()) to Supabase.
 * The DB assigns real UUIDs for the workout and its exercises — the
 * returned Workout uses those, not the deterministic string IDs
 * generateWorkout() produced, since those only ever existed to identify
 * the object before it had a real persisted identity.
 *
 * Also pre-creates one workout_sets row per planned set (empty/unlogged),
 * so logging a set later is always a plain UPDATE, never an upsert.
 */
export async function createWorkout(
  supabase: SupabaseClient,
  userId: string,
  workout: Workout
): Promise<Workout> {
  const { data: workoutRow, error: workoutError } = await supabase
    .from("workouts")
    .insert({
      user_id: userId,
      title: workout.title,
      estimated_minutes: workout.estimatedMinutes,
      status: workout.status,
      scheduled_for: workout.scheduledFor,
      note: workout.note ?? null,
    })
    .select("*")
    .single();

  if (workoutError) throw new Error(workoutError.message);

  const exerciseInserts = workout.exercises.map((we) => ({
    workout_id: workoutRow.id,
    exercise_id: we.exerciseId,
    order_index: we.order,
    planned_sets: we.plannedSets,
  }));

  const { data: weRows, error: weError } = await supabase
    .from("workout_exercises")
    .insert(exerciseInserts)
    .select("*");

  if (weError) throw new Error(weError.message);

  const setInserts = (weRows ?? []).flatMap((we: WorkoutExerciseRow) =>
    we.planned_sets.map((ps) => ({
      workout_exercise_id: we.id,
      set_number: ps.setNumber,
      weight_kg: null,
      reps: null,
      completed: false,
      skipped: false,
    }))
  );

  const { data: setRows, error: setError } =
    setInserts.length > 0
      ? await supabase.from("workout_sets").insert(setInserts).select("*")
      : { data: [], error: null };

  if (setError) throw new Error(setError.message);

  const weWithSets = (weRows ?? []).map((we: WorkoutExerciseRow) => ({
    ...we,
    workout_sets: (setRows ?? []).filter(
      (s: WorkoutSetRow) => s.workout_exercise_id === we.id
    ),
  }));

  return rowToWorkout({ ...workoutRow, workout_exercises: weWithSets });
}

export async function fetchWorkoutById(
  supabase: SupabaseClient,
  userId: string,
  workoutId: string
): Promise<Workout | null> {
  const { data, error } = await supabase
    .from("workouts")
    .select(WORKOUT_SELECT)
    .eq("user_id", userId)
    .eq("id", workoutId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? rowToWorkout(data as unknown as WorkoutRow) : null;
}

export async function fetchWorkoutByDate(
  supabase: SupabaseClient,
  userId: string,
  dateISO: string
): Promise<Workout | null> {
  const { data, error } = await supabase
    .from("workouts")
    .select(WORKOUT_SELECT)
    .eq("user_id", userId)
    .eq("scheduled_for", dateISO)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? rowToWorkout(data as unknown as WorkoutRow) : null;
}

export async function fetchRecentCompletedWorkouts(
  supabase: SupabaseClient,
  userId: string,
  limit = 5
): Promise<Workout[]> {
  const { data, error } = await supabase
    .from("workouts")
    .select(WORKOUT_SELECT)
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToWorkout(row as unknown as WorkoutRow));
}

/** Fetches every workout for the user — used by History (client-side grouped/sorted, matching current app behavior). */
export async function fetchAllWorkouts(
  supabase: SupabaseClient,
  userId: string
): Promise<Workout[]> {
  const { data, error } = await supabase
    .from("workouts")
    .select(WORKOUT_SELECT)
    .eq("user_id", userId)
    .order("scheduled_for", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToWorkout(row as unknown as WorkoutRow));
}

export async function startWorkout(
  supabase: SupabaseClient,
  userId: string,
  workoutId: string
): Promise<void> {
  const { error } = await supabase
    .from("workouts")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", workoutId)
    .is("started_at", null);

  if (error) throw new Error(error.message);
}

export async function logSet(
  supabase: SupabaseClient,
  workoutExerciseId: string,
  setNumber: number,
  patch: Partial<Pick<LoggedSet, "weightKg" | "reps" | "completed" | "skipped" | "note">>
): Promise<void> {
  const row: Record<string, unknown> = {};
  if ("weightKg" in patch) row.weight_kg = patch.weightKg;
  if ("reps" in patch) row.reps = patch.reps;
  if ("completed" in patch) row.completed = patch.completed;
  if ("skipped" in patch) row.skipped = patch.skipped;
  if ("note" in patch) row.note = patch.note ?? null;

  // Ownership is enforced by RLS via the workout_exercises → workouts join
  // policy — no need to pass/check user_id directly on this child table.
  const { error } = await supabase
    .from("workout_sets")
    .update(row)
    .eq("workout_exercise_id", workoutExerciseId)
    .eq("set_number", setNumber);

  if (error) throw new Error(error.message);
}

export async function markExerciseSkipped(
  supabase: SupabaseClient,
  workoutExerciseId: string
): Promise<void> {
  const { error } = await supabase
    .from("workout_exercises")
    .update({ skipped: true })
    .eq("id", workoutExerciseId);

  if (error) throw new Error(error.message);
}

export async function completeWorkout(
  supabase: SupabaseClient,
  userId: string,
  workoutId: string,
  perceivedDifficulty: NonNullable<Workout["perceivedDifficulty"]>,
  note?: string
): Promise<void> {
  const { error } = await supabase
    .from("workouts")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      perceived_difficulty: perceivedDifficulty,
      note: note ?? null,
    })
    .eq("user_id", userId)
    .eq("id", workoutId);

  if (error) throw new Error(error.message);
}
