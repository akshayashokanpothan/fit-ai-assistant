"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDemoStore } from "@/lib/demo/store";
import { useWorkouts } from "@/lib/workouts/workouts-context";
import { useMeals } from "@/lib/meals/meals-context";
import { useActivities } from "@/lib/activities/activities-context";
import { useProfile } from "@/lib/profile/profile-context";
import { estimateDailyTargets } from "@/lib/nutrition/targets";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { sumNutrition } from "@/lib/nutrition/seed-foods";
import { Footprints, Dumbbell, UtensilsCrossed, MessageCircle } from "lucide-react";
import { formatISO, format } from "date-fns";
import { getExerciseById } from "@/lib/demo/seed-exercises";

export default function TodayPage() {
  const router = useRouter();
  const { state } = useDemoStore();
  const { workouts, loading: workoutsLoading, error: workoutsError } = useWorkouts();
  const { meals, loading: mealsLoading, error: mealsError } = useMeals();
  const { profile, loading: profileLoading } = useProfile();
  const { activities } = useActivities();
  const today = formatISO(new Date(), { representation: "date" });

  const todaysMeals = useMemo(
    () =>
      meals
        .filter((m) => m.eventTime.slice(0, 10) === today && m.confirmationState === "confirmed")
        .sort((a, b) => a.eventTime.localeCompare(b.eventTime)),
    [meals, today]
  );
  const todaysActivity = activities.filter((a) => a.eventDate === today && a.confirmationState === "confirmed");
  const todaysWorkout = workouts.find((w) => w.scheduledFor === today);

  type ThreadItem = {
    time: string;
    icon: React.ReactNode;
    title: string;
    detail: string;
  };

  const thread: ThreadItem[] = [
    ...todaysMeals.map((m) => ({
      time: format(new Date(m.eventTime), "h:mm a"),
      icon: <UtensilsCrossed className="h-4 w-4" />,
      title: capitalize(m.mealType),
      detail: m.items.map((i) => `${i.quantityLabel} ${i.name}`).join(", "),
    })),
    ...todaysActivity.map((a) => ({
      time: "Today",
      icon: <Footprints className="h-4 w-4" />,
      title: "Activity",
      detail: [
        a.steps ? `${a.steps.toLocaleString()} steps` : null,
        a.distanceKm ? `${a.distanceKm} km` : null,
        a.activeKcal ? `${a.activeKcal} kcal active` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  // Never silently fall back to the seeded demo profile for an
  // authenticated user — wait for the real profile to load. In practice
  // the parent (app) layout already gates this page behind a loaded,
  // onboarded profile, so this is a defensive fallback rather than the
  // expected path.
  if (profileLoading || workoutsLoading || mealsLoading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line-strong border-t-primary" />
      </div>
    );
  }

  // Consumed-so-far totals (kcal/protein/carbs/fat) come from today's logged meals.
  const targets = estimateDailyTargets(profile);
  const totals = sumNutrition(todaysMeals.map((m) => m.totalNutrition));
  const summary = {
    kcal: Math.round(totals.kcal),
    proteinG: Math.round(totals.proteinG),
    carbsG: Math.round(totals.carbsG),
    fatG: Math.round(totals.fatG),
  };
  const proteinPct = targets.proteinG
    ? Math.min(100, Math.round((summary.proteinG / targets.proteinG) * 100))
    : 0;

  return (
    <div className="px-5 pt-6">
      <p className="font-display text-sm italic text-primary">
        {format(new Date(), "EEEE, d MMMM")}
      </p>
      <h1 className="mt-1 font-display text-[26px] font-medium leading-tight text-ink">Today</h1>

      {mealsError && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">
          Failed to load meals: {mealsError}
        </div>
      )}

      {/* Nutrition summary — plain numbers, not a KPI grid */}
      <div className="mt-6 rounded-[var(--radius-lg)] border border-line bg-surface p-5">
        <div className="flex items-baseline justify-between">
          <span className="tabular font-display text-3xl font-medium text-ink">
            {summary.kcal.toLocaleString()}
          </span>
          <span className="text-sm text-muted">of ~{targets.kcal.toLocaleString()} kcal</span>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-soft">Protein</span>
          <span className="tabular text-ink-soft">
            {summary.proteinG} / {targets.proteinG}g
          </span>
        </div>
        <Progress value={proteinPct} className="mt-2" />
      </div>

      {/* Day thread — actual chronological sequence of the day */}
      <div className="mt-8">
        <h2 className="mb-4 text-sm font-medium text-ink-soft">What happened today</h2>
        {thread.length === 0 ? (
          <EmptyToday />
        ) : (
          <ol className="relative ml-3 space-y-6 border-l border-line pl-6">
            {thread.map((item, idx) => (
              <li key={idx} className="relative">
                <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft text-primary">
                  {item.icon}
                </span>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[15px] font-medium text-ink">{item.title}</span>
                  <span className="tabular text-xs text-muted">{item.time}</span>
                </div>
                <p className="mt-0.5 text-sm text-ink-soft">{item.detail}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Workout */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-ink-soft">Workout</h2>
        {workoutsError && (
           <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">
             Failed to load workouts: {workoutsError}
           </div>
        )}
        {todaysWorkout ? (
          <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-primary" />
                  <span className="font-display text-lg font-medium text-ink">
                    {todaysWorkout.title}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  ~{todaysWorkout.estimatedMinutes} min · {todaysWorkout.exercises.length} exercises
                </p>
              </div>
              <Badge variant={todaysWorkout.status === "completed" ? "default" : "muted"}>
                {statusLabel(todaysWorkout.status)}
              </Badge>
            </div>
            <ul className="mt-4 space-y-1.5 text-sm text-ink-soft">
              {todaysWorkout.exercises.slice(0, 3).map((we) => {
                const ex = getExerciseById(we.exerciseId);
                return (
                  <li key={we.id}>
                    {ex?.name} · {we.plannedSets.length}×{we.plannedSets[0]?.targetRepsLow}-
                    {we.plannedSets[0]?.targetRepsHigh}
                  </li>
                );
              })}
              {todaysWorkout.exercises.length > 3 && (
                <li className="text-muted">+{todaysWorkout.exercises.length - 3} more</li>
              )}
            </ul>
            {todaysWorkout.status !== "completed" && (
              <Button
                className="mt-4 w-full"
                onClick={() => router.push(`/workout/${todaysWorkout.id}`)}
              >
                {todaysWorkout.status === "in_progress" ? "Resume workout" : "Start workout"}
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-line-strong p-5 text-center">
            <p className="text-sm text-ink-soft">No workout planned yet today.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => router.push("/ai")}>
              Ask AI for today&apos;s workout
            </Button>
          </div>
        )}
      </div>

      <Button
        variant="outline"
        className="mt-8 w-full"
        onClick={() => router.push("/ai")}
      >
        <MessageCircle className="h-4 w-4" /> Ask AI about today
      </Button>

      <div className="h-4" />
    </div>
  );
}

function EmptyToday() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-line-strong p-6 text-center">
      <p className="text-sm text-ink-soft">Nothing logged yet. Snap a photo of your next meal and I&apos;ll take it from there.</p>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function statusLabel(s: string) {
  if (s === "in_progress") return "In progress";
  if (s === "completed") return "Completed";
  if (s === "skipped") return "Skipped";
  return "Not started";
}
