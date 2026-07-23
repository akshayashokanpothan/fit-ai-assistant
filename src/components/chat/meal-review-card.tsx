"use client";

import { useState } from "react";
import type { MealItem, MealType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { sumNutrition } from "@/lib/nutrition/seed-foods";
import { Pencil, Check, Trash2 } from "lucide-react";

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "snack", label: "Snack" },
  { value: "dinner", label: "Dinner" },
  { value: "other", label: "Other" },
];

function defaultMealType(): MealType {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 19) return "snack";
  return "dinner";
}

export function MealReviewCard({
  initialItems,
  onConfirm,
}: {
  initialItems: MealItem[];
  onConfirm: (items: MealItem[], mealType: MealType) => void;
}) {
  const [items, setItems] = useState(initialItems);
  const [mealType, setMealType] = useState<MealType>(defaultMealType());
  const [editing, setEditing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const total = sumNutrition(items.map((i) => i.nutrition));

  function updateItem(id: string, patch: Partial<MealItem>) {
    setItems((s) => s.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }
  function removeItem(id: string) {
    setItems((s) => s.filter((i) => i.id !== id));
  }

  if (confirmed) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-[var(--radius-md)] border border-primary-soft bg-primary-soft px-4 py-3 text-sm text-primary">
        <Check className="h-4 w-4" /> Meal logged
      </div>
    );
  }

  return (
    <div className="mt-2 w-full max-w-sm rounded-[var(--radius-lg)] border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-ink-soft">Detected — please review</span>
        <button
          onClick={() => setEditing((e) => !e)}
          className="flex items-center gap-1 text-xs text-primary"
        >
          <Pencil className="h-3 w-3" /> {editing ? "Done" : "Edit"}
        </button>
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2">
            {editing ? (
              <>
                <Input
                  className="h-9 flex-1"
                  value={item.name}
                  onChange={(e) => updateItem(item.id, { name: e.target.value })}
                />
                <Input
                  className="h-9 w-24"
                  value={item.quantityLabel}
                  onChange={(e) => updateItem(item.id, { quantityLabel: e.target.value })}
                />
                <button
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remove ${item.name}`}
                  className="text-muted hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <span className="text-sm text-ink">
                  {item.quantityLabel} {item.name}
                </span>
                {item.confidence < 0.6 && (
                  <Badge variant="accent" className="shrink-0">low confidence</Badge>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-3 grid grid-cols-4 gap-2 border-t border-line pt-3 text-center">
        <Metric label="kcal" value={Math.round(total.kcal)} />
        <Metric label="protein" value={`${Math.round(total.proteinG)}g`} />
        <Metric label="carbs" value={`${Math.round(total.carbsG)}g`} />
        <Metric label="fat" value={`${Math.round(total.fatG)}g`} />
      </div>
      <p className="mt-2 text-center text-[11px] text-muted">Estimated values</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {MEAL_TYPES.map((mt) => (
          <button
            key={mt.value}
            onClick={() => setMealType(mt.value)}
            className={`rounded-full border px-3 py-1 text-xs ${
              mealType === mt.value
                ? "border-primary bg-primary-soft text-primary"
                : "border-line-strong text-ink-soft"
            }`}
          >
            {mt.label}
          </button>
        ))}
      </div>

      <Button
        className="mt-4 w-full"
        disabled={items.length === 0}
        onClick={() => {
          onConfirm(items, mealType);
          setConfirmed(true);
        }}
      >
        Confirm meal
      </Button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="tabular text-sm font-medium text-ink">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}
