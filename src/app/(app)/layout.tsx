"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDemoStore } from "@/lib/demo/store";
import { BottomNav } from "@/components/bottom-nav";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { state, hydrated } = useDemoStore();

  useEffect(() => {
    if (!hydrated) return;
    if (!state.onboardingComplete) router.replace("/onboarding");
  }, [hydrated, state.onboardingComplete, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line-strong border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-1 flex-col bg-paper">
      <main className="flex-1 pb-2">{children}</main>
      <BottomNav />
    </div>
  );
}
