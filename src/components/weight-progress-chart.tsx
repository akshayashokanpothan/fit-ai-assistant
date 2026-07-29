"use client";

import { useMemo } from "react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { BodyMetric } from "@/types";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface WeightProgressChartProps {
  metrics: BodyMetric[];
}

export function WeightProgressChart({ metrics }: WeightProgressChartProps) {
  const data = useMemo(() => {
    // Generate the last 7 days
    const today = new Date();
    // Create an array of the last 7 days in chronological order
    const days = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(today, 6 - i);
      const isoDate = date.toISOString().split("T")[0];
      
      // Find the most recent metric recorded on or before this day
      // Since metrics are ordered by recorded_at desc (newest first), 
      // we find the first metric whose date is <= isoDate.
      const metric = metrics.find(m => m.recordedAt.split("T")[0] <= isoDate);
      
      return {
        date,
        isToday: i === 6,
        weight: metric ? metric.weightKg : null,
      };
    });
    
    return days;
  }, [metrics]);

  const validWeights = data.map(d => d.weight).filter((w): w is number => w !== null);
  const minWeight = validWeights.length > 0 ? Math.min(...validWeights) : 0;
  const maxWeight = validWeights.length > 0 ? Math.max(...validWeights) : 100;
  
  const hasData = validWeights.length > 0;
  
  // Chart dimensions
  const height = 160;
  // SVG uses viewBox for responsive scaling
  const padding = { top: 30, bottom: 40, left: 0, right: 0 };
  const chartHeight = height - padding.top - padding.bottom;
  
  // Y-axis range calculation (add some padding to min/max)
  const yMin = hasData ? Math.floor(minWeight - 2) : 0;
  const yMax = hasData ? Math.ceil(maxWeight + 2) : 100;
  const yRange = yMax - yMin || 1;

  // Map a weight to an SVG Y coordinate
  const getY = (weight: number) => {
    return padding.top + chartHeight - ((weight - yMin) / yRange) * chartHeight;
  };

  // Map an index (0-6) to an SVG X coordinate (0-100%)
  const getX = (index: number) => {
    return (index / 6) * 100;
  };

  // Build the SVG path for the line
  let pathD = "";
  let previousX: number | null = null;
  
  data.forEach((point, i) => {
    if (point.weight !== null) {
      const x = getX(i);
      const y = getY(point.weight);
      if (previousX === null) {
        pathD += `M ${x} ${y}`;
      } else {
        pathD += ` L ${x} ${y}`;
      }
      previousX = x;
    }
  });

  return (
    <div className="rounded-[20px] bg-surface p-5 border border-line">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {hasData && data[6].weight && data[0].weight && data[6].weight < data[0].weight ? (
             <TrendingDown className="w-5 h-5 text-primary" />
          ) : hasData && data[6].weight && data[0].weight && data[6].weight > data[0].weight ? (
             <TrendingUp className="w-5 h-5 text-ink-soft" />
          ) : (
             <Minus className="w-5 h-5 text-ink-soft" />
          )}
          <h2 className="text-[14px] font-bold text-ink">Last 7 days – Weight (kg)</h2>
        </div>
      </div>

      {!hasData ? (
        <div className="h-[160px] flex items-center justify-center rounded-[12px] bg-paper">
          <span className="text-[13px] text-ink-soft font-medium">No weight data available</span>
        </div>
      ) : (
        <div className="relative w-full overflow-visible">
          {/* Today highlight column */}
          <div className="absolute right-0 top-0 bottom-0 w-[14.28%] bg-primary-soft/50 rounded-[12px] -z-10 pointer-events-none" />
          
          {/* SVG for the line only, allowing non-proportional scaling */}
          <svg className="w-full overflow-visible" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
             {pathD && (
               <path
                 d={pathD}
                 fill="none"
                 stroke="#335f42"
                 strokeWidth="1.5"
                 strokeLinecap="round"
                 strokeLinejoin="round"
                 vectorEffect="non-scaling-stroke"
               />
             )}
          </svg>
          
          {/* HTML Overlays for data points and labels (prevents oval stretching) */}
          {data.map((point, i) => {
             if (point.weight === null) return null;
             const x = getX(i);
             const y = getY(point.weight);
             
             return (
               <div key={i} className="absolute inset-0 pointer-events-none">
                 {/* Circle */}
                 <div 
                   className="absolute bg-white rounded-full"
                   style={{
                     left: `${x}%`,
                     top: `${y}px`,
                     width: point.isToday ? '12px' : '8px',
                     height: point.isToday ? '12px' : '8px',
                     border: `${point.isToday ? '4px' : '2px'} solid #335f42`,
                     transform: 'translate(-50%, -50%)',
                     zIndex: point.isToday ? 10 : 5
                   }}
                 />
                 {/* Data Label */}
                 <div
                   className={cn(
                     "absolute text-center transform -translate-x-1/2",
                     point.isToday ? "text-[#335f42] font-bold text-[12px]" : "text-ink font-bold text-[10px]"
                   )}
                   style={{
                     left: `${x}%`,
                     top: `${y - 24}px`, // position above circle
                     whiteSpace: 'nowrap'
                   }}
                 >
                   {point.weight.toFixed(1)}
                 </div>
               </div>
             );
          })}
          
          {/* X-axis labels */}
          <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none">
            {data.map((point, i) => {
              const x = getX(i);
              return (
                <div 
                  key={i} 
                  className="absolute flex flex-col items-center justify-end h-full transform -translate-x-1/2"
                  style={{ left: `${x}%` }}
                >
                  <span className={cn(
                    "text-[10px] whitespace-nowrap",
                    point.isToday ? "text-[#335f42] font-bold" : "text-ink-soft"
                  )}>
                    {point.isToday ? "Today" : format(point.date, "eee")}
                  </span>
                  <span className={cn(
                    "text-[9px] whitespace-nowrap",
                    point.isToday ? "text-[#335f42]/80" : "text-muted"
                  )}>
                    {format(point.date, "d MMM")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
