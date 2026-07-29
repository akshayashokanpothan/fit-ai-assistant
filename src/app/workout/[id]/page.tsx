"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkoutsDAL } from "@/lib/data/workouts";
import { getExerciseById } from "@/lib/demo/seed-exercises";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, ChevronRight, SkipForward, Check } from "lucide-react";
import type { Workout } from "@/types";

const DIFFICULTIES: { value: NonNullable<Workout["perceivedDifficulty"]>; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "moderate", label: "Moderate" },
  { value: "hard", label: "Hard" },
  { value: "very_hard", label: "Very hard" },
];

export default function ActiveWorkoutPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { workouts, startWorkout, logSet, markExerciseSkipped, completeWorkout, error: contextError } = useWorkoutsDAL();
  const [localError, setLocalError] = useState<string | null>(null);

  const workout = workouts.find((w) => w.id === params.id);

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<NonNullable<Workout["perceivedDifficulty"]> | null>(null);
  const [note, setNote] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [repsInput, setRepsInput] = useState("");

  const previousWorkout = useMemo(() => {
    if (!workout) return null;
    return [...workouts]
      .filter((w) => w.id !== workout.id && w.status === "completed" && w.title === workout.title)
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))[0];
  }, [workouts, workout]);

  useEffect(() => {
    if (workout && workout.status !== "in_progress" && workout.status !== "completed") {
      startWorkout(workout.id).catch((err) => setLocalError(err.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout?.id, workout?.status]);

  if (!workout) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-ink-soft">This workout couldn&apos;t be found.</p>
        <Button onClick={() => router.push("/today")}>Back to Today</Button>
      </div>
    );
  }

  if (workout.status === "completed") {
    return <WorkoutSummary workout={workout} onDone={() => router.push("/today")} />;
  }

  const totalExercises = workout.exercises.length;
  const currentWE = workout.exercises[exerciseIndex];
  const exercise = getExerciseById(currentWE.exerciseId);
  const log = workout.logs.find((l) => l.workoutExerciseId === currentWE.id);
  const completedSetsCount = log?.sets.filter((s) => s.completed).length ?? 0;
  const currentSetNumber = Math.min(completedSetsCount + 1, currentWE.plannedSets.length);
  const currentSet = currentWE.plannedSets.find((s) => s.setNumber === currentSetNumber);
  const isExerciseDone =
    completedSetsCount >= currentWE.plannedSets.length || log?.skippedExercise;

  const prevExerciseLog = previousWorkout?.logs.find((l) => {
    const prevWE = previousWorkout.exercises.find((e) => e.exerciseId === currentWE.exerciseId);
    return prevWE && l.workoutExerciseId === prevWE.id;
  });
  const prevLastSet = prevExerciseLog?.sets.filter((s) => s.completed).slice(-1)[0];

  async function completeSet() {
    if (!currentSet) return;
    try {
      setLocalError(null);
      await logSet(workout!.id, currentWE.id, currentSet.setNumber, {
        weightKg: weightInput ? Number(weightInput) : null,
        reps: repsInput ? Number(repsInput) : currentSet.targetRepsLow,
        completed: true,
        skipped: false,
      });
      setWeightInput("");
      setRepsInput("");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to log set");
    }
  }

  function goNextExercise() {
    if (exerciseIndex < totalExercises - 1) {
      setExerciseIndex((i) => i + 1);
    }
  }

  async function skipExercise() {
    try {
      setLocalError(null);
      await markExerciseSkipped(workout!.id, currentWE.id);
      goNextExercise();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to skip exercise");
    }
  }

  const overallProgress = Math.round(((exerciseIndex + (isExerciseDone ? 1 : 0)) / totalExercises) * 100);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-paper px-5 pb-8 pt-5">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/today")}
          aria-label="Close workout"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-black/[0.04]"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="font-display text-[15px] font-medium text-ink">{workout.title}</span>
        <span className="tabular text-xs text-muted">
          {exerciseIndex + 1}/{totalExercises}
        </span>
      </div>
      {(localError || contextError) && (
        <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">
          {localError || contextError}
        </div>
      )}
      <Progress value={overallProgress} className="mt-3" />

      <div className="mt-6 flex-1">
        <div className="aspect-[4/3] w-full rounded-[var(--radius-lg)] bg-primary-soft flex items-center justify-center">
          <span className="font-display text-sm italic text-primary/70">
            {exercise?.name ?? "Exercise"} reference
          </span>
        </div>

        <h1 className="mt-5 font-display text-2xl font-medium text-ink">{exercise?.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {exercise?.equipment.replace("_", " ")} · {exercise?.primaryMuscle.replace("_", " ")}
        </p>

        {exercise && exercise.formCues.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {exercise.formCues.map((cue) => (
              <span
                key={cue}
                className="rounded-full bg-accent-soft px-2.5 py-1 text-xs text-accent"
              >
                {cue}
              </span>
            ))}
          </div>
        )}

        {!isExerciseDone && currentSet ? (
          <div className="mt-6 rounded-[var(--radius-lg)] border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink-soft">
                Set {currentSet.setNumber} of {currentWE.plannedSets.length}
              </span>
              <span className="tabular text-xs text-muted">
                Target {currentSet.targetRepsLow}–{currentSet.targetRepsHigh} reps
              </span>
            </div>

            {prevLastSet && (
              <p className="tabular mt-1 text-xs text-muted">
                Previous: {prevLastSet.weightKg ?? "—"} kg × {prevLastSet.reps ?? "—"}
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink-soft">Weight (kg)</span>
                <Input
                  inputMode="decimal"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder={prevLastSet?.weightKg?.toString() ?? "0"}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink-soft">Reps</span>
                <Input
                  inputMode="numeric"
                  value={repsInput}
                  onChange={(e) => setRepsInput(e.target.value)}
                  placeholder={`${currentSet.targetRepsLow}`}
                />
              </label>
            </div>

            <Button className="mt-4 w-full" onClick={completeSet}>
              <Check className="h-4 w-4" /> Complete set
            </Button>
          </div>
        ) : (
          <div className="mt-6 rounded-[var(--radius-lg)] border border-primary-soft bg-primary-soft p-5 text-center">
            <Check className="mx-auto h-5 w-5 text-primary" />
            <p className="mt-2 text-sm text-primary">
              {log?.skippedExercise ? "Exercise skipped" : "All sets complete"}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-2">
        {!isExerciseDone && (
          <Button variant="ghost" className="flex-1" onClick={skipExercise}>
            <SkipForward className="h-4 w-4" /> Skip
          </Button>
        )}
        {exerciseIndex < totalExercises - 1 ? (
          <Button
            className="flex-1"
            variant={isExerciseDone ? "primary" : "outline"}
            onClick={goNextExercise}
            disabled={!isExerciseDone}
          >
            Next exercise <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <FinishWorkoutButton
            disabled={!isExerciseDone}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            note={note}
            setNote={setNote}
            onFinish={async () => {
              if (!difficulty) return;
              try {
                setLocalError(null);
                await completeWorkout(workout!.id, difficulty, note.trim() || undefined);
              } catch (err) {
                setLocalError(err instanceof Error ? err.message : "Failed to complete workout");
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

function FinishWorkoutButton({
  disabled,
  difficulty,
  setDifficulty,
  note,
  setNote,
  onFinish,
}: {
  disabled: boolean;
  difficulty: NonNullable<Workout["perceivedDifficulty"]> | null;
  setDifficulty: (d: NonNullable<Workout["perceivedDifficulty"]>) => void;
  note: string;
  setNote: (n: string) => void;
  onFinish: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!open) {
    return (
      <Button className="flex-1" disabled={disabled} onClick={() => setOpen(true)}>
        Finish workout
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/30 sm:items-center sm:justify-center">
      <div className="w-full max-w-md rounded-t-[var(--radius-lg)] bg-surface p-6 sm:rounded-[var(--radius-lg)]">
        <h2 className="font-display text-xl font-medium text-ink">How did that feel?</h2>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              onClick={() => setDifficulty(d.value)}
              className={`h-12 rounded-[var(--radius-sm)] border text-xs font-medium ${
                difficulty === d.value
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-line-strong text-ink-soft"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <Textarea
          className="mt-4"
          rows={2}
          placeholder="Optional note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button
          className="mt-5 w-full"
          disabled={!difficulty || saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onFinish();
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Finishing..." : "Save workout"}
        </Button>
      </div>
    </div>
  );
}

function WorkoutSummary({ workout, onDone }: { workout: Workout; onDone: () => void }) {
  const durationMin =
    workout.startedAt && workout.completedAt
      ? Math.max(1, Math.round((new Date(workout.completedAt).getTime() - new Date(workout.startedAt).getTime()) / 60000))
      : workout.estimatedMinutes;
  const totalSets = workout.logs.reduce((s, l) => s + l.sets.filter((st) => st.completed).length, 0);
  const exercisesCompleted = workout.logs.filter((l) => !l.skippedExercise).length;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
        <Check className="h-7 w-7 text-primary" />
      </div>
      <h1 className="mt-5 font-display text-2xl font-medium text-ink">Workout complete</h1>
      <div className="mt-6 grid grid-cols-3 gap-6">
        <Metric label="minutes" value={durationMin} />
        <Metric label="exercises" value={exercisesCompleted} />
        <Metric label="sets" value={totalSets} />
      </div>
      {workout.perceivedDifficulty && (
        <p className="mt-4 text-sm text-ink-soft">
          Felt <span className="font-medium text-ink">{workout.perceivedDifficulty.replace("_", " ")}</span>
        </p>
      )}
      <Button className="mt-8 w-full" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="tabular font-display text-2xl font-medium text-ink">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}
