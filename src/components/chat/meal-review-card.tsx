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
  onConfirm: (items: MealItem[], mealType: MealType) => Promise<void>;
}) {
  const [items, setItems] = useState(initialItems);
  const [mealType, setMealType] = useState<MealType>(defaultMealType());
  const [editing, setEditing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = sumNutrition(items.map((i) => i.nutrition));

  function updateItem(id: string, patch: Partial<MealItem>) {
    setItems((s) => s.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }
  function removeItem(id: string) {
    setItems((s) => s.filter((i) => i.id !== id));
  }

  if (confirmed) {
    return (
      <div className="mt-2 w-full max-w-[280px] rounded-[20px] border border-primary-soft bg-primary-soft/30 p-5">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary mb-3 shadow-sm">
            <Check className="h-6 w-6 text-primary-ink" />
          </div>
          <h3 className="text-[16px] font-bold text-ink mb-1">Meal Logged!</h3>
          <p className="text-[13px] text-ink-soft mb-4">
            Added {Math.round(total.kcal)} kcal to your daily total.
          </p>
          <div className="flex gap-4 mb-4 text-[12px] font-medium text-ink">
             <div className="flex flex-col items-center">
               <span className="text-ink-soft">Protein</span>
               <span>{Math.round(total.proteinG)}g</span>
             </div>
             <div className="flex flex-col items-center">
               <span className="text-ink-soft">Carbs</span>
               <span>{Math.round(total.carbsG)}g</span>
             </div>
             <div className="flex flex-col items-center">
               <span className="text-ink-soft">Fat</span>
               <span>{Math.round(total.fatG)}g</span>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 w-full max-w-[300px] rounded-[20px] border border-line-strong bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[14px] font-bold text-ink">Review {mealType}</span>
        <button
          onClick={() => setEditing((e) => !e)}
          className="flex items-center gap-1.5 text-[12px] font-medium text-primary hover:text-primary-hover transition-colors"
          disabled={loading}
        >
          {editing ? "Done" : <><Pencil className="h-3.5 w-3.5" /> Edit</>}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-[12px] bg-danger-soft p-3 text-[13px] text-danger border border-danger/20 font-medium">
          {error}
        </div>
      )}

      <ul className="space-y-3 mb-5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 group">
            {editing ? (
              <>
                <Input
                  className="h-8 flex-1 text-[13px] border-line focus-visible:ring-1 focus-visible:ring-primary px-2"
                  value={item.name}
                  onChange={(e) => updateItem(item.id, { name: e.target.value })}
                />
                <Input
                  className="h-8 w-20 text-[13px] border-line focus-visible:ring-1 focus-visible:ring-primary px-2 text-center"
                  value={item.quantityLabel}
                  onChange={(e) => updateItem(item.id, { quantityLabel: e.target.value })}
                />
                <button
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remove ${item.name}`}
                  className="text-muted hover:text-danger p-1 rounded-md transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-col">
                   <span className="text-[14px] font-medium text-ink capitalize">
                     {item.name}
                   </span>
                   <span className="text-[12px] text-ink-soft">
                     {item.quantityLabel}
                   </span>
                </div>
                {item.confidence < 0.6 && (
                  <Badge variant="accent" className="shrink-0 text-[10px] uppercase tracking-wider px-2 py-0.5">verify</Badge>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-4 gap-2 rounded-[12px] bg-paper p-3 text-center border border-line">
        <Metric label="kcal" value={Math.round(total.kcal)} />
        <Metric label="protein" value={`${Math.round(total.proteinG)}g`} />
        <Metric label="carbs" value={`${Math.round(total.carbsG)}g`} />
        <Metric label="fat" value={`${Math.round(total.fatG)}g`} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {MEAL_TYPES.map((mt) => (
          <button
            key={mt.value}
            onClick={() => setMealType(mt.value)}
            className={`rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
              mealType === mt.value
                ? "border-primary bg-primary text-primary-ink shadow-sm"
                : "border-line-strong text-ink-soft hover:border-ink-soft"
            }`}
            disabled={loading}
          >
            {mt.label}
          </button>
        ))}
      </div>

      <Button
        className="mt-5 w-full rounded-full h-11 text-[14px] font-bold shadow-sm"
        disabled={items.length === 0 || loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          try {
            await onConfirm(items, mealType);
            setConfirmed(true);
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to save meal");
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "Saving..." : "Confirm meal"}
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
