"use client";

import { useState } from "react";
import type { Plan } from "@/types";
import { Button } from "@/components/ui/button";
import { usePlans } from "@/lib/plans/plans-context";
import { format } from "date-fns";
import { Check } from "lucide-react";

export function PlanPreviewCard({ plan }: { plan: Plan }) {
  const { setActivePlan } = usePlans();
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  return (
    <div className="mt-2 w-full max-w-sm rounded-[var(--radius-lg)] border border-line bg-surface p-4">
      <span className="text-sm font-medium text-ink-soft">Next 3 days</span>

      <div className="mt-3 space-y-3">
        {plan.days.map((day) => (
          <div key={day.dayIndex} className="rounded-[var(--radius-md)] bg-paper p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">
                {format(new Date(day.date), "EEE, d MMM")}
              </span>
              {day.completed && <Check className="h-3.5 w-3.5 text-primary" />}
            </div>
            <p className="mt-1 text-sm font-medium text-ink">
              {day.workoutTitle ?? "Recovery"}
            </p>
            <p className="tabular mt-0.5 text-xs text-ink-soft">
              ~{day.nutritionTargetKcal} kcal · {day.proteinTargetG}g protein
            </p>
            <p className="mt-1 text-xs text-muted">{day.mealSuggestions.join(" · ")}</p>
          </div>
        ))}
      </div>

      {accepted ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-primary">
          <Check className="h-4 w-4" /> Plan accepted
        </div>
      ) : (
        <Button
          className="mt-4 w-full"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await setActivePlan(plan);
              setAccepted(true);
            } catch (err) {
              console.error(err);
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving…" : "Accept plan"}
        </Button>
      )}
    </div>
  );
}
