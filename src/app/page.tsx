"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDemoStore } from "@/lib/demo/store";

export default function RootPage() {
  const router = useRouter();
  const { state, hydrated } = useDemoStore();

  useEffect(() => {
    if (!hydrated) return;
    router.replace(state.onboardingComplete ? "/ai" : "/onboarding");
  }, [hydrated, state.onboardingComplete, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line-strong border-t-primary" />
    </div>
  );
}
