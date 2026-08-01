"use client";

import { useState, useEffect, useMemo } from "react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { ChevronUp } from "lucide-react";
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
  max: number;
  getDailyValue: (meals: Meal[], activities: Activity[], isoDate: string) => number | null;
  getTargetValue?: (targets: { kcal: number; proteinG: number }) => number | null;
}

const METRICS_CONFIG: Record<MetricId, MetricConfig> = {
  proteinConsumed: {
    id: "proteinConsumed",
    label: "Protein",
    color: "#335f42",
    max: 200,
    getDailyValue: (meals, _, isoDate) => {
      const dayMeals = meals.filter(m => m.eventTime.startsWith(isoDate) && m.confirmationState === "confirmed");
      if (dayMeals.length === 0) return null;
      return dayMeals.reduce((sum, m) => sum + (m.totalNutrition?.proteinG || 0), 0);
    },
    getTargetValue: (targets) => targets.proteinG
  },
  caloriesConsumed: {
    id: "caloriesConsumed",
    label: "Calories (In)",
    color: "#f97316",
    max: 2500,
    getDailyValue: (meals, _, isoDate) => {
      const dayMeals = meals.filter(m => m.eventTime.startsWith(isoDate) && m.confirmationState === "confirmed");
      if (dayMeals.length === 0) return null;
      return dayMeals.reduce((sum, m) => sum + (m.totalNutrition?.kcal || 0), 0);
    },
    getTargetValue: (targets) => targets.kcal
  },
  fatConsumed: {
    id: "fatConsumed",
    label: "Fat",
    color: "#eab308",
    max: 100,
    getDailyValue: (meals, _, isoDate) => {
      const dayMeals = meals.filter(m => m.eventTime.startsWith(isoDate) && m.confirmationState === "confirmed");
      if (dayMeals.length === 0) return null;
      return dayMeals.reduce((sum, m) => sum + (m.totalNutrition?.fatG || 0), 0);
    },
  },
  caloriesBurned: {
    id: "caloriesBurned",
    label: "Calories (Out)",
    color: "#ef4444",
    max: 1000,
    getDailyValue: (_, activities, isoDate) => {
      const dayActs = activities.filter(a => a.eventDate === isoDate && a.confirmationState === "confirmed");
      if (dayActs.length === 0) return null;
      return dayActs.reduce((sum, a) => sum + (a.activeKcal || 0), 0);
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

  const height = 220;
  const padding = { top: 40, bottom: 40, left: 16, right: 16 };
  const chartHeight = height - padding.top - padding.bottom;

  const m1Config = METRICS_CONFIG[metric1];
  const m2Config = METRICS_CONFIG[metric2];

  const yMax1 = m1Config.max;
  const yMax2 = m2Config.max;

  const getY1 = (val: number) => {
    const clamped = Math.min(val, yMax1);
    return padding.top + chartHeight - (clamped / yMax1) * chartHeight;
  };
  const getY2 = (val: number) => {
    const clamped = Math.min(val, yMax2);
    return padding.top + chartHeight - (clamped / yMax2) * chartHeight;
  };
  
  const getX = (index: number) => {
    // Add padding to the left and right inside the SVG container space so dots aren't clipped
    return padding.left + (index / 6) * (100 - padding.left - padding.right); 
  };
  const getXPct = (index: number) => {
     // Return percentage string for HTML positioning overlay
     return `${getX(index)}%`;
  }

  const validCount1 = data.filter(d => d.val1 !== null).length;
  const validCount2 = data.filter(d => d.val2 !== null).length;
  const isSparse = validCount1 <= 1 && validCount2 <= 1 && (validCount1 + validCount2) > 0;
  
  let path1 = "";
  const validPoints1 = data.map((d, i) => ({ x: getX(i), y: d.val1 !== null ? getY1(d.val1) : null })).filter((p): p is {x: number, y: number} => p.y !== null);
  validPoints1.forEach((p, i) => {
    if (i === 0) {
      path1 += `M ${p.x} ${p.y}`;
    } else {
      const prev = validPoints1[i - 1];
      const cpX = prev.x + (p.x - prev.x) / 2;
      path1 += ` C ${cpX} ${prev.y}, ${cpX} ${p.y}, ${p.x} ${p.y}`;
    }
  });

  let path2 = "";
  const validPoints2 = data.map((d, i) => ({ x: getX(i), y: d.val2 !== null ? getY2(d.val2) : null })).filter((p): p is {x: number, y: number} => p.y !== null);
  validPoints2.forEach((p, i) => {
    if (i === 0) {
      path2 += `M ${p.x} ${p.y}`;
    } else {
      const prev = validPoints2[i - 1];
      const cpX = prev.x + (p.x - prev.x) / 2;
      path2 += ` C ${cpX} ${prev.y}, ${cpX} ${p.y}, ${p.x} ${p.y}`;
    }
  });

  if (!loaded) return <div className="h-[280px] w-full rounded-[24px] bg-surface border border-line animate-pulse" />;

  return (
    <div className="rounded-[24px] bg-surface p-5 border border-line">
      <div className="flex flex-col gap-1 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[16px] font-bold text-ink">Your Progress</h2>
            <p className="text-[13px] text-ink-soft mb-2">Compared with your daily goals</p>
          </div>
          <div className="flex flex-col gap-1 items-end mt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-ink-soft font-medium">Logged data</span>
              <div className="w-4 h-[2px] bg-ink-soft rounded-full" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-ink-soft font-medium">Daily target</span>
              <div className="w-4 border-t-2 border-dashed border-ink-soft" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full mt-2">
          <div className="flex items-center gap-2 flex-1 rounded-full border border-line px-3 py-1.5 bg-paper">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m1Config.color }} />
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
          <div className="flex items-center gap-2 flex-1 rounded-full border border-line px-3 py-1.5 bg-paper">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m2Config.color }} />
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

        {/* Y-axis grid lines and labels */}
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map(ratio => {
           const y = padding.top + chartHeight - ratio * chartHeight;
           const val1 = Math.round(yMax1 * ratio);
           const val2 = Math.round(yMax2 * ratio);
           return (
             <div key={ratio} className="absolute left-0 right-0 pointer-events-none border-t border-line-strong" style={{ top: `${y}px`, opacity: 0.4 }}>
               <div className="absolute left-0 -top-4 text-[9px] font-medium text-ink-soft bg-surface px-1">
                 {val1}{m1Config.id.includes("protein") || m1Config.id.includes("fat") ? "g" : ""}
               </div>
               <div className="absolute right-0 -top-4 text-[9px] font-medium text-ink-soft bg-surface px-1">
                 {val2}{m2Config.id.includes("protein") || m2Config.id.includes("fat") ? "g" : ""}
               </div>
             </div>
           );
        })}

        <svg className="w-full overflow-visible" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
          {/* Target Lines */}
          {target1 && (
            <line
              x1="0" y1={getY1(target1)} x2="100" y2={getY1(target1)}
              stroke={m1Config.color} strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.5"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {target2 && (
            <line
              x1="0" y1={getY2(target2)} x2="100" y2={getY2(target2)}
              stroke={m2Config.color} strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.5"
              vectorEffect="non-scaling-stroke"
            />
          )}
          
          <path d={path1} fill="none" stroke={m1Config.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <path d={path2} fill="none" stroke={m2Config.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>

        {/* Target labels */}
        {target1 && (
          <div 
            className="absolute left-2 px-1 bg-surface text-[10px] font-bold leading-none pointer-events-none z-10"
            style={{ 
              top: `${getY1(target1) - 12}px`, 
              color: m1Config.color 
            }}
          >
            User target: {target1}{m1Config.id.includes("protein") ? "g" : " kcal"}
          </div>
        )}
        {target2 && (
          <div 
            className="absolute right-2 px-1 bg-surface text-[10px] font-bold leading-none pointer-events-none z-10 text-right"
            style={{ 
              top: `${getY2(target2) - 12}px`, 
              color: m2Config.color 
            }}
          >
            User target: {target2}{m2Config.id.includes("protein") ? "g" : " kcal"}
          </div>
        )}

        {/* Data points */}
        {data.map((point, i) => {
          const xPct = getXPct(i);
          return (
            <div key={i} className="absolute inset-0 pointer-events-none z-20">
              {point.val1 !== null && (
                <>
                  <div 
                    className={cn("absolute bg-white rounded-full shadow-sm", isSparse && "animate-pulse")}
                    style={{
                      left: xPct,
                      top: `${getY1(point.val1)}px`,
                      width: '8px', height: '8px',
                      border: `2px solid ${m1Config.color}`,
                      transform: 'translate(-50%, -50%)',
                      boxShadow: isSparse ? `0 0 0 4px ${m1Config.color}33` : undefined,
                    }}
                  />
                  {point.val1 > yMax1 && (
                    <div 
                      className="absolute transform -translate-x-1/2 -translate-y-[14px]"
                      style={{ left: xPct, top: `${getY1(point.val1)}px`, color: m1Config.color }}
                    >
                      <ChevronUp className="w-3 h-3" />
                    </div>
                  )}
                </>
              )}
              {point.val2 !== null && (
                <>
                  <div 
                    className={cn("absolute bg-white rounded-full shadow-sm", isSparse && "animate-pulse")}
                    style={{
                      left: xPct,
                      top: `${getY2(point.val2)}px`,
                      width: '8px', height: '8px',
                      border: `2px solid ${m2Config.color}`,
                      transform: 'translate(-50%, -50%)',
                      boxShadow: isSparse ? `0 0 0 4px ${m2Config.color}33` : undefined,
                    }}
                  />
                  {point.val2 > yMax2 && (
                    <div 
                      className="absolute transform -translate-x-1/2 -translate-y-[14px]"
                      style={{ left: xPct, top: `${getY2(point.val2)}px`, color: m2Config.color }}
                    >
                      <ChevronUp className="w-3 h-3" />
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none">
          {data.map((point, i) => (
            <div 
              key={i} 
              className="absolute transform -translate-x-1/2" 
              style={{ left: getXPct(i) }}
            >
              <span className={cn(
                "text-[11px] font-medium",
                point.isToday ? "text-ink font-bold" : "text-ink-soft"
              )}>
                {point.label}
              </span>
            </div>
          ))}
        </div>

        {isSparse && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
             <div className="bg-surface/80 backdrop-blur-sm px-4 py-2 rounded-full border border-line shadow-sm mt-16">
               <span className="text-[12px] font-medium text-ink">Keep logging meals to see your weekly trend</span>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
