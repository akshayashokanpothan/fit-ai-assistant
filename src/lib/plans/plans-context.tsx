"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { Plan } from "@/types";
import * as queries from "./queries";

interface PlansContextValue {
  plans: Plan[];
  loading: boolean;
  error: string | null;
  setActivePlan: (plan: Plan) => Promise<void>;
  markPlanDayComplete: (planId: string, dayIndex: number) => Promise<void>;
  refetch: () => Promise<void>;
}

const PlansContext = createContext<PlansContextValue | null>(null);

/**
 * Supabase-backed plans state. Migrated off the demo store in Phase 5B.
 */
export function PlansProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (userId: string) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const rows = await queries.fetchPlans(supabase, userId);
        if (requestIdRef.current !== requestId) return;
        setPlans(rows);
      } catch (err) {
        if (requestIdRef.current !== requestId) return;
        setError(err instanceof Error ? err.message : "Couldn't load your plans.");
      } finally {
        if (requestIdRef.current === requestId) setLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      requestIdRef.current++;
      setTimeout(() => {
        setPlans([]);
        setError(null);
        setLoading(false);
      }, 0);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(user.id);
  }, [authLoading, user, load]);

  const handleSetActivePlan = useCallback(
    async (plan: Plan) => {
      if (!user) throw new Error("Not signed in.");
      const created = await queries.createPlan(supabase, user.id, plan);
      setPlans((prev) => [
        created,
        ...prev.map((p) => ({ ...p, status: "superseded" as const })),
      ]);
    },
    [supabase, user]
  );

  const handleMarkPlanDayComplete = useCallback(
    async (planId: string, dayIndex: number) => {
      if (!user) throw new Error("Not signed in.");
      
      // Optimistic update
      setPlans((prev) =>
        prev.map((p) =>
          p.id === planId
            ? {
                ...p,
                days: p.days.map((d) =>
                  d.dayIndex === dayIndex ? { ...d, completed: true } : d
                ),
              }
            : p
        )
      );

      try {
        await queries.markPlanDayComplete(supabase, user.id, planId, dayIndex);
      } catch (err) {
        // Revert on failure
        await load(user.id);
        throw err;
      }
    },
    [supabase, user, load]
  );

  const refetch = useCallback(async () => {
    if (!user) return;
    await load(user.id);
  }, [user, load]);

  const value = useMemo<PlansContextValue>(
    () => ({
      plans,
      loading: authLoading || loading,
      error,
      setActivePlan: handleSetActivePlan,
      markPlanDayComplete: handleMarkPlanDayComplete,
      refetch,
    }),
    [plans, authLoading, loading, error, handleSetActivePlan, handleMarkPlanDayComplete, refetch]
  );

  return <PlansContext.Provider value={value}>{children}</PlansContext.Provider>;
}

export function usePlans() {
  const ctx = useContext(PlansContext);
  if (!ctx) throw new Error("usePlans must be used within PlansProvider");
  return ctx;
}
