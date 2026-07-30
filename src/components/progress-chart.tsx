"use client";

import { useState, useEffect, useMemo } from "react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { Meal, Activity, Profile } from "@/types";
import { estimateDailyTargets } from "@/lib/nutrition/targets";

interface ProgressChartProps {
  meals: Meal[];
  activities: Activity[];
  profile: Profile | null;
}

type MetricId = "proteinConsumed" | "caloriesConsumed" | "fatConsumed" | "caloriesBurned";

interface MetricConfig {
  id: MetricId;
  label: string;
  color: string;
  getDailyValue: (meals: Meal[], activities: Activity[], isoDate: string) => number;
  getTargetValue?: (targets: { kcal: number; proteinG: number }) => number | null;
}

const METRICS_CONFIG: Record<MetricId, MetricConfig> = {
  proteinConsumed: {
    id: "proteinConsumed",
    label: "Protein (g)",
    color: "#335f42",
    getDailyValue: (meals, _, isoDate) => {
      return meals
        .filter(m => m.eventTime.startsWith(isoDate) && m.confirmationState === "confirmed")
        .reduce((sum, m) => sum + (m.totalNutrition?.proteinG || 0), 0);
    },
    getTargetValue: (targets) => targets.proteinG
  },
  caloriesConsumed: {
    id: "caloriesConsumed",
    label: "Calories (In)",
    color: "#f97316",
    getDailyValue: (meals, _, isoDate) => {
      return meals
        .filter(m => m.eventTime.startsWith(isoDate) && m.confirmationState === "confirmed")
        .reduce((sum, m) => sum + (m.totalNutrition?.kcal || 0), 0);
    },
    getTargetValue: (targets) => targets.kcal
  },
  fatConsumed: {
    id: "fatConsumed",
    label: "Fat (g)",
    color: "#eab308",
    getDailyValue: (meals, _, isoDate) => {
      return meals
        .filter(m => m.eventTime.startsWith(isoDate) && m.confirmationState === "confirmed")
        .reduce((sum, m) => sum + (m.totalNutrition?.fatG || 0), 0);
    },
  },
  caloriesBurned: {
    id: "caloriesBurned",
    label: "Calories (Out)",
    color: "#ef4444",
    getDailyValue: (_, activities, isoDate) => {
      return activities
        .filter(a => a.eventDate === isoDate && a.confirmationState === "confirmed")
        .reduce((sum, a) => sum + (a.activeKcal || 0), 0);
    },
  }
};

export function ProgressChart({ meals, activities, profile }: ProgressChartProps) {
  const [metric1, setMetric1] = useState<MetricId>("proteinConsumed");
  const [metric2, setMetric2] = useState<MetricId>("caloriesConsumed");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("pace_preferences");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.progressMetric1 && METRICS_CONFIG[parsed.progressMetric1 as MetricId]) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setMetric1(parsed.progressMetric1 as MetricId);
        }
        if (parsed.progressMetric2 && METRICS_CONFIG[parsed.progressMetric2 as MetricId]) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setMetric2(parsed.progressMetric2 as MetricId);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoaded(true);
    }
  }, []);

  const handleMetricChange = (key: "metric1" | "metric2", val: MetricId) => {
    if (key === "metric1") setMetric1(val);
    if (key === "metric2") setMetric2(val);
    try {
      const stored = localStorage.getItem("pace_preferences");
      const parsed = stored ? JSON.parse(stored) : {};
      const newPrefs = {
        ...parsed,
        progressMetric1: key === "metric1" ? val : metric1,
        progressMetric2: key === "metric2" ? val : metric2,
      };
      localStorage.setItem("pace_preferences", JSON.stringify(newPrefs));
    } catch (e) {
      console.error(e);
    }
  };

  const targets = profile ? estimateDailyTargets(profile) : { kcal: 2000, proteinG: 90 };
  const target1 = METRICS_CONFIG[metric1].getTargetValue?.(targets) ?? null;
  const target2 = METRICS_CONFIG[metric2].getTargetValue?.(targets) ?? null;

  const data = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(today, 6 - i);
      const isoDate = date.toISOString().split("T")[0];
      return {
        date,
        isToday: i === 6,
        label: format(date, "EE").slice(0, 1),
        val1: METRICS_CONFIG[metric1].getDailyValue(meals, activities, isoDate),
        val2: METRICS_CONFIG[metric2].getDailyValue(meals, activities, isoDate),
      };
    });
  }, [meals, activities, metric1, metric2]);

  const height = 180;
  const padding = { top: 30, bottom: 40, left: 0, right: 0 };
  const chartHeight = height - padding.top - padding.bottom;

  // Compute Scales independently
  const max1 = Math.max(...data.map(d => d.val1), target1 || 0);
  const max2 = Math.max(...data.map(d => d.val2), target2 || 0);
  
  // Provide a minimal bound so chart doesn't flatten to 0 if max is 0
  const yMax1 = max1 === 0 ? 10 : max1 * 1.2; 
  const yMax2 = max2 === 0 ? 10 : max2 * 1.2;

  const getY1 = (val: number) => padding.top + chartHeight - (val / yMax1) * chartHeight;
  const getY2 = (val: number) => padding.top + chartHeight - (val / yMax2) * chartHeight;
  const getX = (index: number) => (index / 6) * 100;

  const m1Config = METRICS_CONFIG[metric1];
  const m2Config = METRICS_CONFIG[metric2];

  let path1 = "";
  let path2 = "";
  data.forEach((d, i) => {
    const x = getX(i);
    const y1 = getY1(d.val1);
    const y2 = getY2(d.val2);
    path1 += i === 0 ? `M ${x} ${y1}` : ` L ${x} ${y1}`;
    path2 += i === 0 ? `M ${x} ${y2}` : ` L ${x} ${y2}`;
  });

  if (!loaded) return <div className="h-[280px] w-full rounded-[24px] bg-surface border border-line animate-pulse" />;

  return (
    <div className="rounded-[24px] bg-surface p-5 border border-line">
      <div className="flex flex-col gap-3 mb-6">
        <h2 className="text-[16px] font-bold text-ink">Weekly Progress</h2>
        <div className="flex items-center gap-3 w-full">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: m1Config.color }} />
            <select
              value={metric1}
              onChange={(e) => handleMetricChange("metric1", e.target.value as MetricId)}
              className="bg-transparent text-[13px] font-medium text-ink focus:outline-none w-full"
            >
              {Object.values(METRICS_CONFIG).map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: m2Config.color }} />
            <select
              value={metric2}
              onChange={(e) => handleMetricChange("metric2", e.target.value as MetricId)}
              className="bg-transparent text-[13px] font-medium text-ink focus:outline-none w-full"
            >
              {Object.values(METRICS_CONFIG).map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-visible">
        {/* Highlight current day column */}
        <div className="absolute right-0 top-0 bottom-[30px] w-[14.28%] bg-black/5 rounded-[12px] -z-10 pointer-events-none" />

        <svg className="w-full overflow-visible" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
          {/* Target Lines */}
          {target1 && (
            <line
              x1="0" y1={getY1(target1)} x2="100" y2={getY1(target1)}
              stroke={m1Config.color} strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.4"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {target2 && (
            <line
              x1="0" y1={getY2(target2)} x2="100" y2={getY2(target2)}
              stroke={m2Config.color} strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.4"
              vectorEffect="non-scaling-stroke"
            />
          )}
          
          <path d={path1} fill="none" stroke={m1Config.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <path d={path2} fill="none" stroke={m2Config.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>

        {/* Data points */}
        {data.map((point, i) => {
          const x = getX(i);
          return (
            <div key={i} className="absolute inset-0 pointer-events-none">
              <div 
                className="absolute bg-white rounded-full shadow-sm"
                style={{
                  left: `${x}%`,
                  top: `${getY1(point.val1)}px`,
                  width: '8px', height: '8px',
                  border: `2px solid ${m1Config.color}`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
              <div 
                className="absolute bg-white rounded-full shadow-sm"
                style={{
                  left: `${x}%`,
                  top: `${getY2(point.val2)}px`,
                  width: '8px', height: '8px',
                  border: `2px solid ${m2Config.color}`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            </div>
          );
        })}

        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 h-8 flex justify-between items-end pointer-events-none">
          {data.map((point, i) => (
            <div key={i} className="w-[14.28%] text-center">
              <span className={cn(
                "text-[11px] font-medium",
                point.isToday ? "text-ink font-bold" : "text-ink-soft"
              )}>
                {point.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
