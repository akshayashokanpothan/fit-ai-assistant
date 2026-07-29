"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { useDemoStore } from "@/lib/demo/store";
import { usePlans as useSupabasePlans } from "@/lib/plans/plans-context";

/**
 * Data Access Layer for Plans.
 * Wraps Supabase plans context and the demo store to provide a unified API with fallback.
 */
export function usePlansDAL() {
  const { user } = useAuth();
  const supabasePlans = useSupabasePlans();
  
  // Placeholder: Phase 7 is implementing the DAL. 
  // We will map these to `useSupabasePlans` when it's fully integrated.
  const currentPlan = user ? null : null;
  const plans = user ? supabasePlans.plans : [];
  const loading = false;
  const error = null;

  const setActivePlan = async (plan: import("@/types").Plan) => {
    if (user) {
      await supabasePlans.setActivePlan(plan);
    }
  };

  return {
    plans,
    currentPlan,
    loading,
    error,
    setActivePlan,
  };
}
