"use client";

import type { AIContext } from "@/types";

export function TodaySummaryCard({ today }: { today: AIContext["today"] }) {
  const { nutrition, activities, workout } = today;
  const steps = activities.reduce((s, a) => s + (a.steps ?? 0), 0);

  return (
    <div className="mt-2 w-full max-w-sm rounded-[var(--radius-lg)] border border-line bg-surface p-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        <Metric label="kcal" value={nutrition.kcal} />
        <Metric label="protein" value={`${nutrition.proteinG}g`} />
        <Metric label="steps" value={steps || "—"} />
      </div>
      <p className="mt-3 text-sm text-ink-soft">
        {workout
          ? `${workout.title} — ${workout.status === "completed" ? "completed" : "planned"}`
          : "No workout logged yet today."}
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="tabular text-lg font-medium text-ink">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}
