"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useProfileDAL } from "@/lib/data/profile";
import { BottomNav } from "@/components/bottom-nav";
import { TopBar } from "@/components/top-bar";
import { SubscriptionProvider } from "@/providers/subscription-provider";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfileDAL();

  const resolved = !authLoading && !profileLoading;

  useEffect(() => {
    if (!resolved) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!profile?.onboardingCompletedAt) {
      router.replace("/onboarding");
    }
  }, [resolved, user, profile, router]);

  if (!resolved || !user || !profile?.onboardingCompletedAt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line-strong border-t-primary" />
      </div>
    );
  }

  return (
    <SubscriptionProvider>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-1 flex-col bg-paper">
        <TopBar />
        <main className="flex-1 pb-2">{children}</main>
        <BottomNav />
      </div>
    </SubscriptionProvider>
  );
}
