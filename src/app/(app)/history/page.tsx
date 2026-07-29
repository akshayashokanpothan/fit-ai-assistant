"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDemoStore } from "@/lib/demo/store";
import { useWorkouts } from "@/lib/workouts/workouts-context";
import { useMeals } from "@/lib/meals/meals-context";
import { useActivities } from "@/lib/activities/activities-context";
import { getExerciseById } from "@/lib/demo/seed-exercises";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, isToday, isThisWeek, parseISO } from "date-fns";
import { UtensilsCrossed, Dumbbell, Footprints, Scale, MessageCircle } from "lucide-react";

type Group = "Today" | "This week" | "Earlier";

interface HistoryEntry {
  date: string;
  group: Group;
  icon: React.ReactNode;
  title: string;
  detail: string;
  badge?: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const { state } = useDemoStore();
  const { workouts, error: workoutsError } = useWorkouts();
  const { meals, error: mealsError } = useMeals();
  const { activities } = useActivities();
  const [filter, setFilter] = useState<"all" | "meals" | "workouts" | "activity">("all");

  const entries = useMemo<HistoryEntry[]>(() => {
    const items: HistoryEntry[] = [];

    if (filter === "all" || filter === "meals") {
      for (const m of meals) {
        if (m.confirmationState !== "confirmed") continue;
        items.push({
          date: m.eventTime,
          group: groupFor(m.eventTime),
          icon: <UtensilsCrossed className="h-4 w-4" />,
          title: capitalize(m.mealType),
          detail: m.items.map((i) => `${i.quantityLabel} ${i.name}`).join(", "),
          badge: `${Math.round(m.totalNutrition.kcal)} kcal`,
        });
      }
    }

    if (filter === "all" || filter === "workouts") {
      for (const w of workouts) {
        if (w.status !== "completed") continue;
        items.push({
          date: w.completedAt ?? w.scheduledFor,
          group: groupFor(w.completedAt ?? w.scheduledFor),
          icon: <Dumbbell className="h-4 w-4" />,
          title: w.title,
          detail: w.exercises
            .map((we) => getExerciseById(we.exerciseId)?.name)
            .filter(Boolean)
            .slice(0, 3)
            .join(", "),
          badge: w.perceivedDifficulty?.replace("_", " "),
        });
      }
    }

    if (filter === "all" || filter === "activity") {
      for (const a of activities) {
        if (a.confirmationState !== "confirmed") continue;
        items.push({
          date: a.eventDate,
          group: groupFor(a.eventDate),
          icon: <Footprints className="h-4 w-4" />,
          title: "Activity",
          detail: [
            a.steps ? `${a.steps.toLocaleString()} steps` : null,
            a.distanceKm ? `${a.distanceKm} km` : null,
            a.activeKcal ? `${a.activeKcal} kcal active` : null,
          ]
            .filter(Boolean)
            .join(" · "),
        });
      }
    }

    if (filter === "all") {
      for (const bm of state.bodyMetrics) {
        items.push({
          date: bm.recordedAt,
          group: groupFor(bm.recordedAt),
          icon: <Scale className="h-4 w-4" />,
          title: "Weight",
          detail: `${bm.weightKg} kg`,
        });
      }
    }

    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [state, filter, workouts, meals, activities]);

  const grouped: Record<Group, HistoryEntry[]> = {
    Today: entries.filter((e) => e.group === "Today"),
    "This week": entries.filter((e) => e.group === "This week"),
    Earlier: entries.filter((e) => e.group === "Earlier"),
  };

  return (
    <div className="px-5 pt-6">
      <h1 className="font-display text-[26px] font-medium text-ink">History</h1>

      {workoutsError && (
        <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">
          Failed to load workouts: {workoutsError}
        </div>
      )}

      {mealsError && (
        <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">
          Failed to load meals: {mealsError}
        </div>
      )}

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(["all", "meals", "workouts", "activity"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] capitalize ${
              filter === f
                ? "border-primary bg-primary-soft text-primary"
                : "border-line-strong text-ink-soft"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-8">
        {(["Today", "This week", "Earlier"] as Group[]).map((g) =>
          grouped[g].length ? (
            <div key={g}>
              <h2 className="mb-3 text-sm font-medium text-ink-soft">{g}</h2>
              <ul className="space-y-3">
                {grouped[g].map((e, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 rounded-[var(--radius-md)] border border-line bg-surface p-3.5"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                      {e.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[15px] font-medium text-ink">{e.title}</span>
                        {e.badge && <Badge variant="muted">{e.badge}</Badge>}
                      </div>
                      {e.detail && <p className="mt-0.5 truncate text-sm text-ink-soft">{e.detail}</p>}
                      <p className="tabular mt-1 text-[11px] text-muted">
                        {safeFormat(e.date)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null
        )}

        {entries.length === 0 && (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-line-strong p-8 text-center">
            <p className="text-sm text-ink-soft">Nothing here yet.</p>
          </div>
        )}
      </div>

      <Button variant="outline" className="mt-8 w-full" onClick={() => router.push("/ai")}>
        <MessageCircle className="h-4 w-4" /> Ask AI about my history
      </Button>

      <div className="h-6" />
    </div>
  );
}

function groupFor(dateStr: string): Group {
  try {
    const d = dateStr.length === 10 ? parseISO(dateStr) : new Date(dateStr);
    if (isToday(d)) return "Today";
    if (isThisWeek(d, { weekStartsOn: 1 })) return "This week";
    return "Earlier";
  } catch {
    return "Earlier";
  }
}

function safeFormat(dateStr: string) {
  try {
    const d = dateStr.length === 10 ? parseISO(dateStr) : new Date(dateStr);
    return format(d, "d MMM, h:mm a");
  } catch {
    return dateStr;
  }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
