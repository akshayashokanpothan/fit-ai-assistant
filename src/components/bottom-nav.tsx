"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Sun, History, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/ai", label: "AI", icon: MessageCircle },
  { href: "/today", label: "Today", icon: Sun },
  { href: "/history", label: "History", icon: History },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-1 py-2.5"
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={cn("h-5 w-5", active ? "text-primary" : "text-muted")}
                strokeWidth={active ? 2.25 : 1.75}
              />
              <span
                className={cn(
                  "text-[11px] font-medium",
                  active ? "text-primary" : "text-muted"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
