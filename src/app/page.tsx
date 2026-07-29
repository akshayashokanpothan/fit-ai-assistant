"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useProfileDAL } from "@/lib/data/profile";

export default function RootPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfileDAL();

  useEffect(() => {
    if (authLoading || profileLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }
    // profile is guaranteed non-null once ProfileProvider finishes loading
    // for a signed-in user (it creates one on first access) — the
    // onboarding_completed_at check defaults safely to "incomplete" if it
    // were ever unexpectedly null.
    router.replace(profile?.onboardingCompletedAt ? "/today" : "/onboarding");
  }, [authLoading, profileLoading, user, profile, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line-strong border-t-primary" />
    </div>
  );
}
