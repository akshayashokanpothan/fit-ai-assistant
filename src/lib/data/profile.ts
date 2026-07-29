"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useDemoStore } from "@/lib/demo/store";
import { createClient } from "@/utils/supabase/client";
import { useProfile as useSupabaseProfile } from "@/lib/profile/profile-context";
import type { Profile } from "@/types";

/**
 * Data Access Layer for Profile and Body Metrics.
 * Supports Supabase as the primary data source with the local demo store as a fallback.
 */
export function useProfileDAL() {
  const { user } = useAuth();
  const demoStore = useDemoStore();
  const supabaseProfile = useSupabaseProfile();



  // If user is logged in, use Supabase profile context, else fallback to demo store
  const profile = user ? supabaseProfile.profile : demoStore.state.profile;


  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (user) {
        return await supabaseProfile.updateProfile(patch);
      } else {
        demoStore.updateProfile(patch);
        return { error: null };
      }
    },
    [user, demoStore, supabaseProfile]
  );

  const completeOnboarding = useCallback(
    async (patch: Partial<Profile>) => {
      if (user) {
        return await supabaseProfile.completeOnboarding(patch);
      } else {
        demoStore.completeOnboarding(patch);
        return { error: null };
      }
    },
    [user, demoStore, supabaseProfile]
  );

  const loading = user ? supabaseProfile.loading : false;
  const error = user ? supabaseProfile.error : null;

  return {
    profile,
    loading,
    error,
    updateProfile,
    completeOnboarding,
  };
}
