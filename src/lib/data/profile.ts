"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useDemoStore } from "@/lib/demo/store";
import { createClient } from "@/utils/supabase/client";
import type { Profile } from "@/types";

/**
 * Data Access Layer for Profile and Body Metrics.
 * Supports Supabase as the primary data source with the local demo store as a fallback.
 */
export function useProfileDAL() {
  const { user } = useAuth();
  const demoStore = useDemoStore();
  const supabase = useMemo(() => createClient(), []);

  // TODO: Implement actual SWR / async fetching for Supabase data
  // For now, if logged in, this would fetch from Supabase. If not, it falls back to demo store.
  const profile = user ? demoStore.state.profile : demoStore.state.profile; // Placeholder until fetching is implemented
  const bodyMetrics = user ? demoStore.state.bodyMetrics : demoStore.state.bodyMetrics;

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (user) {
        const { error } = await supabase
          .from("profiles")
          .update({
            display_name: patch.displayName,
            goal: patch.goal,
            age: patch.age,
            sex: patch.sex,
            height_cm: patch.heightCm,
            weight_kg: patch.weightKg,
            experience: patch.experience,
            environment: patch.environment,
            frequency_per_week: patch.frequencyPerWeek,
            diet_preference: patch.dietPreference,
            diet_restrictions: patch.dietRestrictions,
            limitations: patch.limitations,
            onboarding_completed_at: patch.onboardingCompletedAt,
          })
          .eq("user_id", user.id);

        if (error) throw error;
        // Opt-in UI optimistic update or mutate cache here
      } else {
        demoStore.updateProfile(patch);
      }
    },
    [user, demoStore, supabase]
  );

  const completeOnboarding = useCallback(
    async (patch: Partial<Profile>) => {
      if (user) {
        await updateProfile({
          ...patch,
          onboardingCompletedAt: new Date().toISOString(),
        });
      } else {
        demoStore.completeOnboarding(patch);
      }
    },
    [user, demoStore, updateProfile]
  );

  const addBodyMetric = useCallback(
    async (weightKg: number) => {
      if (user) {
        const { error } = await supabase.from("body_metrics").insert({
          user_id: user.id,
          weight_kg: weightKg,
        });

        if (error) throw error;
      } else {
        demoStore.addBodyMetric(weightKg);
      }
    },
    [user, demoStore, supabase]
  );

  return {
    profile,
    bodyMetrics,
    updateProfile,
    completeOnboarding,
    addBodyMetric,
  };
}
