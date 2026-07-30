"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getUserPlanAction } from "@/app/actions/getUserPlan";
import { useAuth } from "@/lib/auth/auth-context";
import type { Plan } from "@/lib/subscription";

interface SubscriptionContextType {
  plan: Plan | null;
  loading: boolean;
  refreshPlan: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  plan: null,
  loading: true,
  refreshPlan: async () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshPlan = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setPlan(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const fetchedPlan = await getUserPlanAction(user.id);
      setPlan(fetchedPlan);
    } catch (error) {
      console.error("Failed to refresh plan:", error);
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshPlan();
  }, [refreshPlan]);

  return (
    <SubscriptionContext.Provider value={{ plan, loading, refreshPlan }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
