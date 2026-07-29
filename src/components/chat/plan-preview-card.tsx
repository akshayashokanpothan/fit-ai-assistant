"use client";

import { useState } from "react";
import type { Plan } from "@/types";
import { Button } from "@/components/ui/button";
import { usePlansDAL } from "@/lib/data/plans";
import { format } from "date-fns";
import { Check, Calendar, ChevronRight } from "lucide-react";

export function PlanPreviewCard({ plan }: { plan: Plan }) {
  const { setActivePlan } = usePlansDAL();
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  return (
    <div className="mt-2 w-full max-w-[320px] rounded-[24px] border border-line-strong bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#335f42]" />
          <span className="text-[15px] font-bold text-ink">Your {plan.days.length}-day plan</span>
        </div>
        <button className="rounded-full border border-line px-3 py-1 text-[11px] font-medium text-ink-soft hover:text-ink hover:bg-black/[0.04] transition-colors">
          View details
        </button>
      </div>

      <div className="flex flex-col gap-4 mb-5">
        {plan.days.map((day) => (
          <div key={day.dayIndex} className="flex gap-4 group cursor-pointer">
            <div className="flex flex-col items-center w-10 shrink-0 text-[12px] pt-0.5">
              <span className="text-ink-soft">{format(new Date(day.date), "EEE")}</span>
              <span className="text-ink font-bold text-[14px]">{format(new Date(day.date), "d")}</span>
              <span className="text-ink-soft">{format(new Date(day.date), "MMM")}</span>
            </div>
            
            <div className="flex-1 flex justify-between items-center pb-4 border-b border-line group-last:border-0 group-last:pb-0">
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-ink">
                  {day.workoutTitle ?? "Recovery"}
                </span>
                <span className="text-[12px] text-ink-soft font-medium mt-0.5">
                  ~{day.nutritionTargetKcal} kcal • {day.proteinTargetG}g protein
                </span>
                <span className="text-[12px] text-ink-soft mt-0.5 leading-snug">
                  {day.mealSuggestions.join(", ")}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted shrink-0 group-hover:text-ink-soft" />
            </div>
          </div>
        ))}
      </div>

      {accepted ? (
        <div className="flex items-center justify-center gap-2 rounded-full border border-[#335f42] bg-[#335f42]/10 py-3 text-[14px] font-bold text-[#335f42]">
          <Check className="h-4 w-4" /> Plan accepted
        </div>
      ) : (
        <Button
          className="w-full rounded-full h-11 text-[14px] font-bold shadow-sm bg-[#335f42] hover:bg-[#284a33] text-white"
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
