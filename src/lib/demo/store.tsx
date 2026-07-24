"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  Activity,
  BodyMetric,
  ChatMessage,
  ConfirmationState,
  Conversation,
  MealItem,
  MealType,
  MemoryFact,
  Plan,
  Profile,
  UsageEventType,
  Workout,
  WorkoutSetLog,
} from "@/types";
import {
  DEMO_BODY_METRICS,
  DEMO_CONVERSATION,
  DEMO_HISTORY_ACTIVITY,
  DEMO_HISTORY_MEALS,
  DEMO_HISTORY_WORKOUT,
  DEMO_MESSAGES,
  DEMO_PROFILE,
  DEMO_TODAY_ACTIVITY,
  DEMO_TODAY_MEALS,
  DEMO_TODAY_WORKOUT,
  DEMO_USER_ID,
} from "./seed-data";
import { sumNutrition } from "@/lib/nutrition/seed-foods";
import { estimateDailyTargets } from "@/lib/nutrition/targets";
import { formatISO } from "date-fns";

const STORAGE_KEY = "sahaay_demo_state_v1";

interface DemoState {
  onboardingComplete: boolean;
  profile: Profile;
  meals: import("@/types").Meal[];
  activities: Activity[];
  workouts: Workout[];
  plans: Plan[];
  bodyMetrics: BodyMetric[];
  conversation: Conversation;
  messages: ChatMessage[];
  derivedMemory: MemoryFact[];
  usageCount: Record<UsageEventType, number>;
}

function seedState(onboarded: boolean): DemoState {
  return {
    onboardingComplete: onboarded,
    profile: DEMO_PROFILE,
    meals: [...DEMO_TODAY_MEALS, ...DEMO_HISTORY_MEALS],
    activities: [...DEMO_TODAY_ACTIVITY, ...DEMO_HISTORY_ACTIVITY],
    workouts: [DEMO_TODAY_WORKOUT, DEMO_HISTORY_WORKOUT],
    plans: [],
    bodyMetrics: DEMO_BODY_METRICS,
    conversation: DEMO_CONVERSATION,
    messages: DEMO_MESSAGES,
    derivedMemory: [
      {
        id: "mem-1",
        userId: DEMO_USER_ID,
        layer: "derived",
        key: "usual training time",
        value: "typically trains in the evening",
        confidence: 0.6,
        createdAt: new Date().toISOString(),
      },
      {
        id: "mem-2",
        userId: DEMO_USER_ID,
        layer: "derived",
        key: "exercise preference",
        value: "tends to prefer machine exercises over free weights",
        confidence: 0.55,
        createdAt: new Date().toISOString(),
      },
    ],
    usageCount: {
      ai_message: 0,
      image_analysis: 0,
      food_scan: 0,
      screenshot_scan: 0,
      plan_generation: 0,
    },
  };
}

function todayISO() {
  return formatISO(new Date(), { representation: "date" });
}

interface DemoStoreValue {
  state: DemoState;
  hydrated: boolean;
  completeOnboarding: (profile: Partial<Profile>) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  confirmMeal: (
    mealType: MealType,
    items: MealItem[],
    source: "image_ai" | "manual" | "screenshot_ai",
    mediaUploadId?: string
  ) => void;
  confirmActivity: (
    draft: Partial<Activity> & { activityType: string },
    source: "screenshot_ai" | "manual"
  ) => void;
  upsertWorkout: (workout: Workout) => void;
  startWorkout: (workoutId: string) => void;
  logSet: (
    workoutId: string,
    workoutExerciseId: string,
    setNumber: number,
    patch: Partial<WorkoutSetLog["sets"][number]>
  ) => void;
  markExerciseSkipped: (workoutId: string, workoutExerciseId: string) => void;
  completeWorkout: (
    workoutId: string,
    perceivedDifficulty: NonNullable<Workout["perceivedDifficulty"]>,
    note?: string
  ) => void;
  setActivePlan: (plan: Plan) => void;
  markPlanDayComplete: (planId: string, dayIndex: number) => void;
  addBodyMetric: (weightKg: number) => void;
  recordUsage: (type: UsageEventType) => void;
  todaySummary: () => {
    date: string;
    kcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    targetKcal: number;
    targetProteinG: number;
  };
  resetDemo: () => void;
}

const DemoStoreContext = createContext<DemoStoreValue | null>(null);

export function DemoStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(() => seedState(false));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Deliberate one-time hydration read: localStorage is only available
    // client-side, so state must start from the seed default (matching the
    // server-rendered HTML) and then sync from storage after mount. The
    // `hydrated` flag gates all rendering until this completes, so there is
    // no visible flash/mismatch — this is the standard SSR-safe pattern for
    // synchronizing from an external, synchronous browser API.
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(JSON.parse(raw));
      }
    } catch {
      // ignore corrupt storage, keep defaults
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage may be unavailable (private mode) — fail silently for demo
    }
  }, [state, hydrated]);

  const completeOnboarding = useCallback((profile: Partial<Profile>) => {
    setState((s) => ({
      ...s,
      onboardingComplete: true,
      profile: {
        ...s.profile,
        ...profile,
        onboardingCompletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setState((s) => ({
      ...s,
      profile: { ...s.profile, ...patch, updatedAt: new Date().toISOString() },
    }));
  }, []);

  const addMessage = useCallback((message: ChatMessage) => {
    setState((s) => ({ ...s, messages: [...s.messages, message] }));
  }, []);

  const updateMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setState((s) => ({
      ...s,
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  }, []);

  const confirmMeal = useCallback(
    (
      mealType: MealType,
      items: MealItem[],
      source: "image_ai" | "manual" | "screenshot_ai",
      mediaUploadId?: string
    ) => {
      const totalNutrition = sumNutrition(items.map((i) => i.nutrition));
      const meal = {
        id: `meal-${Date.now()}`,
        userId: DEMO_USER_ID,
        mealType,
        eventTime: new Date().toISOString(),
        items,
        totalNutrition,
        source,
        confidence: items.reduce((a, i) => a + i.confidence, 0) / Math.max(items.length, 1),
        confirmationState: "confirmed" as ConfirmationState,
        mediaUploadId: mediaUploadId ?? null,
        createdAt: new Date().toISOString(),
      };
      setState((s) => ({ ...s, meals: [meal, ...s.meals] }));
    },
    []
  );

  const confirmActivity = useCallback(
    (draft: Partial<Activity> & { activityType: string }, source: "screenshot_ai" | "manual") => {
      const activity: Activity = {
        id: `activity-${Date.now()}`,
        userId: DEMO_USER_ID,
        source,
        activityType: draft.activityType,
        steps: draft.steps,
        distanceKm: draft.distanceKm,
        activeKcal: draft.activeKcal,
        durationMin: draft.durationMin,
        eventDate: todayISO(),
        confidence: draft.confidence ?? 0.9,
        confirmationState: "confirmed",
        createdAt: new Date().toISOString(),
      };
      setState((s) => ({ ...s, activities: [activity, ...s.activities] }));
    },
    []
  );

  const upsertWorkout = useCallback((workout: Workout) => {
    setState((s) => {
      const exists = s.workouts.some((w) => w.id === workout.id);
      return {
        ...s,
        workouts: exists
          ? s.workouts.map((w) => (w.id === workout.id ? workout : w))
          : [workout, ...s.workouts],
      };
    });
  }, []);

  const startWorkout = useCallback((workoutId: string) => {
    setState((s) => ({
      ...s,
      workouts: s.workouts.map((w) =>
        w.id === workoutId
          ? { ...w, status: "in_progress", startedAt: w.startedAt ?? new Date().toISOString() }
          : w
      ),
    }));
  }, []);

  const logSet = useCallback(
    (
      workoutId: string,
      workoutExerciseId: string,
      setNumber: number,
      patch: Partial<WorkoutSetLog["sets"][number]>
    ) => {
      setState((s) => ({
        ...s,
        workouts: s.workouts.map((w) => {
          if (w.id !== workoutId) return w;
          const logs = [...w.logs];
          let log = logs.find((l) => l.workoutExerciseId === workoutExerciseId);
          const we = w.exercises.find((e) => e.id === workoutExerciseId);
          if (!log) {
            log = {
              workoutExerciseId,
              sets: (we?.plannedSets ?? []).map((ps) => ({
                setNumber: ps.setNumber,
                weightKg: null,
                reps: null,
                completed: false,
                skipped: false,
              })),
            };
            logs.push(log);
          }
          log.sets = log.sets.map((st) =>
            st.setNumber === setNumber ? { ...st, ...patch } : st
          );
          return { ...w, logs };
        }),
      }));
    },
    []
  );

  const markExerciseSkipped = useCallback((workoutId: string, workoutExerciseId: string) => {
    setState((s) => ({
      ...s,
      workouts: s.workouts.map((w) => {
        if (w.id !== workoutId) return w;
        const logs = [...w.logs];
        let log = logs.find((l) => l.workoutExerciseId === workoutExerciseId);
        if (!log) {
          log = { workoutExerciseId, sets: [] };
          logs.push(log);
        }
        log.skippedExercise = true;
        return { ...w, logs };
      }),
    }));
  }, []);

  const completeWorkout = useCallback(
    (
      workoutId: string,
      perceivedDifficulty: NonNullable<Workout["perceivedDifficulty"]>,
      note?: string
    ) => {
      setState((s) => ({
        ...s,
        workouts: s.workouts.map((w) =>
          w.id === workoutId
            ? {
                ...w,
                status: "completed",
                completedAt: new Date().toISOString(),
                perceivedDifficulty,
                note,
              }
            : w
        ),
      }));
    },
    []
  );

  const setActivePlan = useCallback((plan: Plan) => {
    setState((s) => ({
      ...s,
      plans: [plan, ...s.plans.map((p) => ({ ...p, status: "superseded" as const }))],
    }));
  }, []);

  const markPlanDayComplete = useCallback((planId: string, dayIndex: number) => {
    setState((s) => ({
      ...s,
      plans: s.plans.map((p) =>
        p.id === planId
          ? {
              ...p,
              days: p.days.map((d) => (d.dayIndex === dayIndex ? { ...d, completed: true } : d)),
            }
          : p
      ),
    }));
  }, []);

  const addBodyMetric = useCallback((weightKg: number) => {
    setState((s) => ({
      ...s,
      bodyMetrics: [
        ...s.bodyMetrics,
        { id: `bm-${Date.now()}`, userId: DEMO_USER_ID, weightKg, recordedAt: new Date().toISOString() },
      ],
      profile: { ...s.profile, weightKg, updatedAt: new Date().toISOString() },
    }));
  }, []);

  const recordUsage = useCallback((type: UsageEventType) => {
    setState((s) => ({
      ...s,
      usageCount: { ...s.usageCount, [type]: (s.usageCount[type] ?? 0) + 1 },
    }));
  }, []);

  const todaySummary = useCallback(() => {
    const today = todayISO();
    const todaysMeals = state.meals.filter(
      (m) => m.eventTime.slice(0, 10) === today && m.confirmationState === "confirmed"
    );
    const totals = sumNutrition(todaysMeals.map((m) => m.totalNutrition));
    const targets = estimateDailyTargets(state.profile);
    return {
      date: today,
      kcal: Math.round(totals.kcal),
      proteinG: Math.round(totals.proteinG),
      carbsG: Math.round(totals.carbsG),
      fatG: Math.round(totals.fatG),
      targetKcal: targets.kcal,
      targetProteinG: targets.proteinG,
    };
  }, [state.meals, state.profile]);

  const resetDemo = useCallback(() => {
    const fresh = seedState(false);
    setState(fresh);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<DemoStoreValue>(
    () => ({
      state,
      hydrated,
      completeOnboarding,
      updateProfile,
      addMessage,
      updateMessage,
      confirmMeal,
      confirmActivity,
      upsertWorkout,
      startWorkout,
      logSet,
      markExerciseSkipped,
      completeWorkout,
      setActivePlan,
      markPlanDayComplete,
      addBodyMetric,
      recordUsage,
      todaySummary,
      resetDemo,
    }),
    [
      state,
      hydrated,
      completeOnboarding,
      updateProfile,
      addMessage,
      updateMessage,
      confirmMeal,
      confirmActivity,
      upsertWorkout,
      startWorkout,
      logSet,
      markExerciseSkipped,
      completeWorkout,
      setActivePlan,
      markPlanDayComplete,
      addBodyMetric,
      recordUsage,
      todaySummary,
      resetDemo,
    ]
  );

  return <DemoStoreContext.Provider value={value}>{children}</DemoStoreContext.Provider>;
}

export function useDemoStore() {
  const ctx = useContext(DemoStoreContext);
  if (!ctx) throw new Error("useDemoStore must be used within DemoStoreProvider");
  return ctx;
}
