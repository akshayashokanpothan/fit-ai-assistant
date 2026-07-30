"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Pencil } from "lucide-react";

export interface ActivityDraft {
  activityType: string;
  steps?: number;
  distanceKm?: number;
  activeKcal?: number;
  durationMin?: number;
  confidence: number;
}

export function ActivityReviewCard({
  draft,
  onConfirm,
  isConfirmed = false,
}: {
  draft: ActivityDraft;
  onConfirm: (draft: ActivityDraft) => void;
  isConfirmed?: boolean;
}) {
  const [values, setValues] = useState(draft);
  const [editing, setEditing] = useState(false);
  const [confirmed, setConfirmed] = useState(isConfirmed);

  if (confirmed) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-[var(--radius-md)] border border-primary-soft bg-primary-soft px-4 py-3 text-sm text-primary">
        <Check className="h-4 w-4" /> Activity logged
      </div>
    );
  }

  return (
    <div className="mt-2 w-full max-w-sm rounded-[var(--radius-lg)] border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-ink-soft">I found</span>
        <button
          onClick={() => setEditing((e) => !e)}
          className="flex items-center gap-1 text-xs text-primary"
        >
          <Pencil className="h-3 w-3" /> {editing ? "Done" : "Edit"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Steps"
          value={values.steps}
          editing={editing}
          onChange={(v) => setValues((s) => ({ ...s, steps: v }))}
        />
        <Field
          label="Distance (km)"
          value={values.distanceKm}
          editing={editing}
          onChange={(v) => setValues((s) => ({ ...s, distanceKm: v }))}
        />
        <Field
          label="Active kcal"
          value={values.activeKcal}
          editing={editing}
          onChange={(v) => setValues((s) => ({ ...s, activeKcal: v }))}
        />
        <Field
          label="Duration (min)"
          value={values.durationMin}
          editing={editing}
          onChange={(v) => setValues((s) => ({ ...s, durationMin: v }))}
        />
      </div>
      <p className="mt-3 text-[11px] text-muted">Estimated from the screenshot</p>

      <div className="mt-4 flex gap-2">
        <Button className="flex-1" onClick={() => { onConfirm(values); setConfirmed(true); }}>
          Confirm
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value: number | undefined;
  editing: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="text-[11px] text-muted">{label}</div>
      {editing ? (
        <Input
          className="mt-1 h-9"
          inputMode="decimal"
          value={value ?? ""}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
        />
      ) : (
        <div className="tabular mt-1 text-[15px] font-medium text-ink">{value ?? "—"}</div>
      )}
    </div>
  );
}
