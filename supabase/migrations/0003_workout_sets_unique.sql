-- ─────────────────────────────────────────────────────────────────────────
-- Pace AI — Add unique constraint to workout_sets
-- Ensures that pre-creating sets and then updating them based on set_number
-- is safe against race conditions.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.workout_sets
  add constraint workout_sets_workout_exercise_id_set_number_key unique (workout_exercise_id, set_number);
