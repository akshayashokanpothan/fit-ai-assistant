"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { LoggedSet, Workout } from "@/types";
import * as queries from "./queries";

interface WorkoutResult {
  error: string | null;
  workout?: Workout;
}

interface WorkoutsContextValue {
  workouts: Workout[];
  loading: boolean;
  error: string | null;
  createWorkout: (workout: Workout) => Promise<WorkoutResult>;
  startWorkout: (workoutId: string) => Promise<void>;
  logSet: (
    workoutId: string,
    workoutExerciseId: string,
    setNumber: number,
    patch: Partial<Pick<LoggedSet, "weightKg" | "reps" | "completed" | "skipped" | "note">>
  ) => Promise<void>;
  markExerciseSkipped: (workoutId: string, workoutExerciseId: string) => Promise<void>;
  completeWorkout: (
    workoutId: string,
    perceivedDifficulty: NonNullable<Workout["perceivedDifficulty"]>,
    note?: string
  ) => Promise<void>;
  refetch: () => Promise<void>;
}

const WorkoutsContext = createContext<WorkoutsContextValue | null>(null);

/**
 * Supabase-backed workout state — the first entity migrated off the demo
 * store (Phase 5B). Meals, activities, and plans remain demo-store-backed
 * until they're migrated in the same pattern.
 */
export function WorkoutsProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (userId: string) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const rows = await queries.fetchAllWorkouts(supabase, userId);
        if (requestIdRef.current !== requestId) return;
        setWorkouts(rows);
      } catch (err) {
        if (requestIdRef.current !== requestId) return;
        setError(err instanceof Error ? err.message : "Couldn't load your workouts.");
      } finally {
        if (requestIdRef.current === requestId) setLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Deliberate reaction to an external system (the auth session
      // clearing) — not derivable state. Same justified exception used in
      // src/lib/demo/store.tsx and src/lib/profile/profile-context.tsx.
      requestIdRef.current++;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWorkouts([]);
      setError(null);
      setLoading(false);
      return;
    }
    load(user.id);
  }, [authLoading, user, load]);

  const handleCreate = useCallback(
    async (workout: Workout): Promise<WorkoutResult> => {
      if (!user) return { error: "Not signed in." };
      try {
        const created = await queries.createWorkout(supabase, user.id, workout);
        setWorkouts((prev) => [created, ...prev]);
        return { error: null, workout: created };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Couldn't save that workout.";
        return { error: message };
      }
    },
    [supabase, user]
  );

  const handleStart = useCallback(
    async (workoutId: string) => {
      if (!user) return;
      await queries.startWorkout(supabase, user.id, workoutId);
      setWorkouts((prev) =>
        prev.map((w) =>
          w.id === workoutId
            ? { ...w, status: "in_progress", startedAt: w.startedAt ?? new Date().toISOString() }
            : w
        )
      );
    },
    [supabase, user]
  );

  const handleLogSet = useCallback(
    async (
      workoutId: string,
      workoutExerciseId: string,
      setNumber: number,
      patch: Partial<Pick<LoggedSet, "weightKg" | "reps" | "completed" | "skipped" | "note">>
    ) => {
      await queries.logSet(supabase, workoutExerciseId, setNumber, patch);
      setWorkouts((prev) =>
        prev.map((w) => {
          if (w.id !== workoutId) return w;
          const logs = w.logs.map((log) =>
            log.workoutExerciseId === workoutExerciseId
              ? {
                  ...log,
                  sets: log.sets.map((s) =>
                    s.setNumber === setNumber ? { ...s, ...patch } : s
                  ),
                }
              : log
          );
          return { ...w, logs };
        })
      );
    },
    [supabase]
  );

  const handleMarkSkipped = useCallback(
    async (workoutId: string, workoutExerciseId: string) => {
      await queries.markExerciseSkipped(supabase, workoutExerciseId);
      setWorkouts((prev) =>
        prev.map((w) => {
          if (w.id !== workoutId) return w;
          const logs = w.logs.map((log) =>
            log.workoutExerciseId === workoutExerciseId
              ? { ...log, skippedExercise: true }
              : log
          );
          return { ...w, logs };
        })
      );
    },
    [supabase]
  );

  const handleComplete = useCallback(
    async (
      workoutId: string,
      perceivedDifficulty: NonNullable<Workout["perceivedDifficulty"]>,
      note?: string
    ) => {
      if (!user) return;
      await queries.completeWorkout(supabase, user.id, workoutId, perceivedDifficulty, note);
      setWorkouts((prev) =>
        prev.map((w) =>
          w.id === workoutId
            ? {
                ...w,
                status: "completed",
                completedAt: new Date().toISOString(),
                perceivedDifficulty,
                note,
              }
            : w
        )
      );
    },
    [supabase, user]
  );

  const refetch = useCallback(async () => {
    if (!user) return;
    await load(user.id);
  }, [user, load]);

  const value = useMemo<WorkoutsContextValue>(
    () => ({
      workouts,
      loading: authLoading || loading,
      error,
      createWorkout: handleCreate,
      startWorkout: handleStart,
      logSet: handleLogSet,
      markExerciseSkipped: handleMarkSkipped,
      completeWorkout: handleComplete,
      refetch,
    }),
    [
      workouts,
      authLoading,
      loading,
      error,
      handleCreate,
      handleStart,
      handleLogSet,
      handleMarkSkipped,
      handleComplete,
      refetch,
    ]
  );

  return <WorkoutsContext.Provider value={value}>{children}</WorkoutsContext.Provider>;
}

export function useWorkouts() {
  const ctx = useContext(WorkoutsContext);
  if (!ctx) throw new Error("useWorkouts must be used within WorkoutsProvider");
  return ctx;
}
