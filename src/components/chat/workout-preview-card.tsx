"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Workout } from "@/types";
import { getExerciseById } from "@/lib/demo/seed-exercises";
import { Button } from "@/components/ui/button";
import { useWorkouts } from "@/lib/workouts/workouts-context";
import { Dumbbell } from "lucide-react";

export function WorkoutPreviewCard({ workout }: { workout: Workout }) {
  const router = useRouter();
  const { createWorkout } = useWorkouts();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAction(action: "start" | "save") {
    setLoading(true);
    setError(null);
    const { error: err, workout: created } = await createWorkout(workout);
    setLoading(false);
    
    if (err || !created) {
      setError(err ?? "Failed to save workout");
      return;
    }

    if (action === "start") {
      router.push(`/workout/${created.id}`);
    } else {
      router.push("/today");
    }
  }

  return (
    <div className="mt-2 w-full max-w-sm rounded-[var(--radius-lg)] border border-line bg-surface p-4">
      <div className="flex items-center gap-2">
        <Dumbbell className="h-4 w-4 text-primary" />
        <span className="font-display text-lg font-medium text-ink">{workout.title}</span>
      </div>
      <p className="mt-0.5 text-sm text-muted">~{workout.estimatedMinutes} minutes</p>

      {error && (
        <p className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-200">
          {error}
        </p>
      )}

      <ul className="mt-3 space-y-1.5">
        {workout.exercises.map((we) => {
          const ex = getExerciseById(we.exerciseId);
          const sets = we.plannedSets;
          return (
            <li key={we.id} className="flex items-center justify-between text-sm">
              <span className="text-ink">{ex?.name ?? "Exercise"}</span>
              <span className="tabular text-muted">
                {sets.length} × {sets[0]?.targetRepsLow}–{sets[0]?.targetRepsHigh}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex gap-2">
        <Button
          className="flex-1"
          disabled={loading}
          onClick={() => handleAction("start")}
        >
          {loading ? "Saving..." : "Start workout"}
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          disabled={loading}
          onClick={() => handleAction("save")}
        >
          Save for later
        </Button>
      </div>
    </div>
  );
}
