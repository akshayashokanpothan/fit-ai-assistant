"use client";

const PROMPTS = [
  "Today's workout",
  "Plan my next 3 days",
  "What should I eat?",
  "How am I doing today?",
];

export function QuickActions({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {PROMPTS.map((p) => (
        <button
          key={p}
          onClick={() => onPick(p)}
          className="shrink-0 whitespace-nowrap rounded-full border border-line-strong bg-surface px-3.5 py-2 text-[13px] text-ink-soft hover:border-primary hover:text-primary"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
