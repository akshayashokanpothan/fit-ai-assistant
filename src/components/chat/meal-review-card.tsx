"use client";

import { useState } from "react";
import type { MealItem, MealType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sumNutrition } from "@/lib/nutrition/seed-foods";
import { Pencil, Check, Trash2, Utensils, ImageIcon } from "lucide-react";

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
  isConfirmed = false,
}: {
  initialItems: MealItem[];
  onConfirm: (items: MealItem[], mealType: MealType) => Promise<void>;
  isConfirmed?: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [mealType, setMealType] = useState<MealType>(defaultMealType());
  const [editing, setEditing] = useState(false);
  const [confirmed, setConfirmed] = useState(isConfirmed);
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
      <div className="mt-2 w-full max-w-[300px] flex gap-3">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#335f42] text-[#335f42] mt-1 bg-surface">
          <Check className="h-4 w-4" />
        </div>
        <div className="flex-1 rounded-[16px] rounded-tl-sm bg-[#e8f1ec] px-4 py-3 text-[14px] text-ink leading-relaxed">
          <span className="font-bold block mb-1">Meal logged!</span>
          You&apos;re at 24g / 136g protein today. Need 112g more to reach your goal.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 w-full max-w-[300px] rounded-[24px] border border-line-strong bg-surface p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <Utensils className="h-4 w-4 text-orange-500" />
        <span className="text-[15px] font-bold text-ink">Meal analysis</span>
      </div>
      <p className="text-[13px] text-ink-soft mb-4">Looks delicious! Here&apos;s what I found.</p>

      {error && (
        <div className="mb-4 rounded-[12px] bg-danger-soft p-3 text-[13px] text-danger border border-danger/20 font-medium">
          {error}
        </div>
      )}

      <ul className="space-y-3 mb-5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            {editing ? (
              <div className="flex flex-1 items-center gap-2">
                <Input
                  className="h-8 flex-1 text-[13px] border-line focus-visible:ring-1 focus-visible:ring-primary px-2"
                  value={item.name}
                  onChange={(e) => updateItem(item.id, { name: e.target.value })}
                />
                <Input
                  className="h-8 w-16 text-[13px] border-line focus-visible:ring-1 focus-visible:ring-primary px-2 text-center"
                  value={item.quantityLabel}
                  onChange={(e) => updateItem(item.id, { quantityLabel: e.target.value })}
                />
                <button
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remove ${item.name}`}
                  className="text-muted hover:text-danger p-1 rounded-md transition-colors shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-paper border border-line overflow-hidden">
                    <ImageIcon className="h-5 w-5 text-muted" />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[14px] font-bold text-ink capitalize">
                       {item.name}
                     </span>
                     <span className="text-[12px] text-ink-soft mt-0.5">
                       Confidence {Math.round(item.confidence * 100)}%
                     </span>
                  </div>
                </div>
                <button
                  onClick={() => setEditing(true)}
                  aria-label="Edit item"
                  className="text-ink-soft hover:text-primary transition-colors p-2"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between mb-3 mt-1 border-t border-line pt-4">
        <span className="text-[14px] font-bold text-ink">Nutrition estimate</span>
        <span className="text-[11px] text-ink-soft">Per serving</span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center mb-5">
        <div className="flex flex-col rounded-[12px] bg-orange-50/50 p-2 border border-orange-100">
          <span className="text-[14px] font-bold text-orange-500">{Math.round(total.kcal)}</span>
          <span className="text-[11px] text-orange-500/80">kcal</span>
        </div>
        <div className="flex flex-col rounded-[12px] bg-[#335f42]/5 p-2 border border-[#335f42]/10">
          <span className="text-[14px] font-bold text-[#335f42]">{Math.round(total.proteinG)}g</span>
          <span className="text-[11px] text-[#335f42]/80">protein</span>
        </div>
        <div className="flex flex-col rounded-[12px] bg-blue-50/50 p-2 border border-blue-100">
          <span className="text-[14px] font-bold text-blue-500">{Math.round(total.carbsG)}g</span>
          <span className="text-[11px] text-blue-500/80">carbs</span>
        </div>
        <div className="flex flex-col rounded-[12px] bg-purple-50/50 p-2 border border-purple-100">
          <span className="text-[14px] font-bold text-purple-500">{Math.round(total.fatG)}g</span>
          <span className="text-[11px] text-purple-500/80">fat</span>
        </div>
      </div>

      {editing && (
        <div className="mb-4 flex flex-wrap gap-2">
          {MEAL_TYPES.map((mt) => (
            <button
              key={mt.value}
              onClick={() => setMealType(mt.value)}
              className={`rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                mealType === mt.value
                  ? "border-[#335f42] bg-[#335f42] text-white shadow-sm"
                  : "border-line-strong text-ink-soft hover:border-ink-soft"
              }`}
              disabled={loading}
            >
              {mt.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 rounded-full h-11 text-[14px] font-bold shadow-sm"
          disabled={loading}
          onClick={() => setEditing(!editing)}
        >
          {editing ? "Done" : "Edit items"}
        </Button>
        
        {!editing && (
          <Button
            className="flex-1 rounded-full h-11 text-[14px] font-bold shadow-sm bg-[#335f42] hover:bg-[#284a33] text-white"
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
            Confirm meal
          </Button>
        )}
      </div>
    </div>
  );
}
