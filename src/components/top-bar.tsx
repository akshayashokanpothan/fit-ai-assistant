"use client";

import Link from "next/link";
import { PaceMark } from "@/components/brand-mark";
import { Avatar } from "@/components/avatar";
import { useDemoStore } from "@/lib/demo/store";

export function TopBar() {
  const { state } = useDemoStore();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <PaceMark size={24} />
          <span className="font-display text-[15px] font-medium text-ink">Pace AI</span>
        </div>

        <Link
          href="/profile"
          aria-label="Open profile"
          className="rounded-full focus-visible:outline-offset-4"
        >
          <Avatar src={state.profile.avatarUrl} size={32} />
        </Link>
      </div>
    </header>
  );
}
