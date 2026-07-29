-- ─────────────────────────────────────────────────────────────────────────
-- Pace AI — Phase 5B schema adjustments
-- Purely additive: no existing columns/tables/policies are altered or
-- removed. Addresses the two gaps identified in the Phase 5A audit.
-- ─────────────────────────────────────────────────────────────────────────

-- Meals: the app computes and stores a total-nutrition snapshot once at
-- creation time (sum of meal_items at that moment) rather than deriving it
-- fresh on every read. Denormalized here to match that exact behavior and
-- avoid a SUM/join on every Today/History render. Nullable — a meal with
-- no items yet (shouldn't happen in practice) simply has no total.
alter table public.meals
  add column if not exists total_kcal numeric(7, 1),
  add column if not exists total_protein_g numeric(6, 1),
  add column if not exists total_carbs_g numeric(6, 1),
  add column if not exists total_fat_g numeric(6, 1);

-- Workouts: the app tracks "this whole exercise was skipped" as a state
-- distinct from any individual set being marked skipped. No existing
-- column captured that at the workout_exercises level.
alter table public.workout_exercises
  add column if not exists skipped boolean not null default false;
