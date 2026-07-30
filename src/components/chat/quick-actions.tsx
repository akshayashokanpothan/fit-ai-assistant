"use client";

import * as React from "react";
import { Camera, Dumbbell, Calendar, BarChart3 } from "lucide-react";

interface Action {
  text: string;
  icon: React.ElementType;
  desc?: string;
  colorClass: string;
  iconClass: string;
  activeIcon: React.ElementType;
  activeText: string;
}

const PROMPTS: Action[] = [
  { 
    text: "Scan my meal", 
    desc: "Take a photo of your meal and get nutrition insights",
    icon: Camera, 
    colorClass: "bg-[#335f42]/10",
    iconClass: "text-[#335f42]",
    activeIcon: Camera,
    activeText: "Scan meal"
  },
  { 
    text: "Plan a workout", 
    desc: "Get a customized workout based on your goals",
    icon: Dumbbell, 
    colorClass: "bg-orange-500/10",
    iconClass: "text-orange-500",
    activeIcon: Dumbbell,
    activeText: "Plan workout"
  },
  { 
    text: "Create a meal plan", 
    desc: "Generate a meal plan for the next few days",
    icon: Calendar, 
    colorClass: "bg-purple-500/10",
    iconClass: "text-purple-500",
    activeIcon: Calendar,
    activeText: "Meal plan"
  },
  { 
    text: "Check my progress", 
    desc: "See your stats and recent activity",
    icon: BarChart3, 
    colorClass: "bg-slate-500/10",
    iconClass: "text-slate-500",
    activeIcon: BarChart3,
    activeText: "My progress"
  },
];

export function QuickActions({ 
  onPick, 
  variant = "active" 
}: { 
  onPick: (text: string) => void;
  variant?: "empty" | "active";
}) {
  if (variant === "empty") {
    return (
      <div className="w-full mt-2">
        <div className="flex items-center justify-between px-1 mb-3">
          <span className="text-[13px] font-semibold text-ink-soft">Quick actions</span>
          <span className="text-[13px] text-[#335f42] font-medium flex items-center gap-1">Swipe &rarr;</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {PROMPTS.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.text}
                onClick={() => onPick(p.text)}
                className="flex items-center gap-2.5 shrink-0 whitespace-nowrap rounded-full border border-line bg-surface p-1.5 pr-4 text-[14px] font-medium text-ink hover:border-line-strong active:scale-[0.98] transition-all shadow-sm group"
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${p.colorClass} ${p.iconClass} group-hover:scale-105 transition-transform`}>
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                {p.activeText}
              </button>
            )
          })}
        </div>
      </div>
    );
  }

  // Active chat (pills)
  // The reference shows exactly 3 pills: Scan meal, Plan workout, What should I eat?
  const activePrompts = PROMPTS.slice(0, 3);
  
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {activePrompts.map((p) => {
        const Icon = p.activeIcon;
        return (
          <button
            key={p.activeText}
            onClick={() => onPick(p.text)}
            className="flex items-center gap-1.5 shrink-0 whitespace-nowrap rounded-full border border-line-strong bg-surface px-4 py-2 text-[13px] font-medium text-ink hover:border-[#335f42] hover:text-[#335f42] transition-colors shadow-sm"
          >
            <Icon className="h-4 w-4 text-[#335f42]/70" />
            {p.activeText}
          </button>
        );
      })}
      <div className="w-2 flex-shrink-0" />
    </div>
  );
}
