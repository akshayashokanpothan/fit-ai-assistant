"use client";

import Link from "next/link";
import { PaceMark } from "@/components/brand-mark";
import { Avatar } from "@/components/avatar";
import { useDemoStore } from "@/lib/demo/store";
import { useSubscription } from "@/providers/subscription-provider";

export function TopBar() {
  const { state } = useDemoStore();
  const { plan } = useSubscription();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <PaceMark size={24} />
          <div className="flex items-center gap-1.5">
            <span className="font-display text-[15px] font-medium text-ink">Pace AI</span>
            <span className="rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
              Beta
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {plan ? (
            <span 
              key={plan.name}
              className="animate-in fade-in zoom-in duration-500 rounded-full border border-line-strong bg-surface px-2.5 py-0.5 text-[11px] font-bold text-[#335f42]"
            >
              {plan.name === "Free" ? "Free" : plan.name === "Pro" ? "Pro ⭐" : "Pro+ ✨"}
            </span>
          ) : (
            <div className="h-5 w-12 rounded-full bg-line animate-pulse" />
          )}
          <Link
            href="/profile"
            aria-label="Open profile"
            className="rounded-full focus-visible:outline-offset-4"
          >
            <Avatar src={state.profile.avatarUrl} size={32} />
          </Link>
        </div>
      </div>
    </header>
  );
}
