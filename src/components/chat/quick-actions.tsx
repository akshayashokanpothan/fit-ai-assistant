"use client";

import * as React from "react";
import { Dumbbell, UtensilsCrossed, Sparkles, Activity } from "lucide-react";

interface Action {
  text: string;
  icon: React.ElementType;
  desc?: string;
}

const PROMPTS: Action[] = [
  { text: "Today's workout", icon: Dumbbell, desc: "See your exercises" },
  { text: "What should I eat?", icon: UtensilsCrossed, desc: "Get meal ideas" },
  { text: "Plan my next 3 days", icon: Sparkles, desc: "Create a schedule" },
  { text: "How am I doing today?", icon: Activity, desc: "Check progress" },
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
      <div className="grid grid-cols-1 gap-3 w-full mt-4">
        {PROMPTS.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.text}
              onClick={() => onPick(p.text)}
              className="flex items-center gap-4 rounded-[20px] border border-line bg-surface p-4 text-left transition-colors hover:border-primary hover:bg-primary-soft/30 w-full"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft/50 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[15px] font-bold text-ink">{p.text}</span>
                <span className="text-[13px] text-ink-soft">{p.desc}</span>
              </div>
            </button>
          )
        })}
      </div>
    );
  }

  // Active chat (pills)
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {PROMPTS.map((p) => (
        <button
          key={p.text}
          onClick={() => onPick(p.text)}
          className="shrink-0 whitespace-nowrap rounded-[12px] border border-line-strong bg-surface px-4 py-2 text-[13px] font-medium text-ink-soft shadow-sm hover:border-primary hover:text-primary transition-colors"
        >
          {p.text}
        </button>
      ))}
      <div className="w-2 flex-shrink-0" />
    </div>
  );
}
