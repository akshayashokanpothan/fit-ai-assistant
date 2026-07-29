"use client";

import { useCallback } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useDemoStore } from "@/lib/demo/store";
import { useWorkouts as useSupabaseWorkouts } from "@/lib/workouts/workouts-context";
import type { LoggedSet, Workout } from "@/types";

/**
 * Data Access Layer for Workouts.
 * Wraps the existing Supabase workouts context and the demo store to provide a unified API with fallback.
 */
export function useWorkoutsDAL() {
  const { user } = useAuth();
  const demoStore = useDemoStore();
  const supabaseWorkouts = useSupabaseWorkouts();

  // If we have a user, use Supabase workouts. 
  // Otherwise, fallback to demo store (although demo store currently clears workouts on reload).
  const workouts = user ? supabaseWorkouts.workouts : [];
  const loading = user ? supabaseWorkouts.loading : false;
  const error = user ? supabaseWorkouts.error : null;

  const createWorkout = useCallback(
    async (workout: Workout) => {
      if (user) {
        return await supabaseWorkouts.createWorkout(workout);
      } else {
        console.warn("[Workouts DAL] Demo store fallback for createWorkout is not fully implemented.");
        return { error: "Demo store fallback not implemented", workout: undefined };
      }
    },
    [user, supabaseWorkouts]
  );

  const startWorkout = useCallback(
    async (workoutId: string) => {
      if (user) {
        await supabaseWorkouts.startWorkout(workoutId);
      }
    },
    [user, supabaseWorkouts]
  );

  const logSet = useCallback(
    async (
      workoutId: string,
      workoutExerciseId: string,
      setNumber: number,
      patch: Partial<Pick<LoggedSet, "weightKg" | "reps" | "completed" | "skipped" | "note">>
    ) => {
      if (user) {
        await supabaseWorkouts.logSet(workoutId, workoutExerciseId, setNumber, patch);
      }
    },
    [user, supabaseWorkouts]
  );

  const markExerciseSkipped = useCallback(
    async (workoutId: string, workoutExerciseId: string) => {
      if (user) {
        await supabaseWorkouts.markExerciseSkipped(workoutId, workoutExerciseId);
      }
    },
    [user, supabaseWorkouts]
  );

  const completeWorkout = useCallback(
    async (
      workoutId: string,
      perceivedDifficulty: NonNullable<Workout["perceivedDifficulty"]>,
      note?: string
    ) => {
      if (user) {
        await supabaseWorkouts.completeWorkout(workoutId, perceivedDifficulty, note);
      }
    },
    [user, supabaseWorkouts]
  );

  const refetch = useCallback(async () => {
    if (user) {
      await supabaseWorkouts.refetch();
    }
  }, [user, supabaseWorkouts]);

  return {
    workouts,
    loading,
    error,
    createWorkout,
    startWorkout,
    logSet,
    markExerciseSkipped,
    completeWorkout,
    refetch,
  };
}
