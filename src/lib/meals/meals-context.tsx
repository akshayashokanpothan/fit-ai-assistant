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
import type { Meal, MealItem, MealType, DataSource } from "@/types";
import * as queries from "./queries";

interface MealsContextValue {
  meals: Meal[];
  loading: boolean;
  error: string | null;
  confirmMeal: (
    mealType: MealType,
    items: MealItem[],
    source: DataSource,
    mediaUploadId?: string
  ) => Promise<void>;
  refetch: () => Promise<void>;
}

const MealsContext = createContext<MealsContextValue | null>(null);

/**
 * Supabase-backed meal state. Migrated off the demo store in Phase 5B.
 */
export function MealsProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (userId: string) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const rows = await queries.fetchAllMeals(supabase, userId);
        if (requestIdRef.current !== requestId) return;
        setMeals(rows);
      } catch (err) {
        if (requestIdRef.current !== requestId) return;
        setError(err instanceof Error ? err.message : "Couldn't load your meals.");
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMeals([]);
      setError(null);
      setLoading(false);
      return;
    }
    load(user.id);
  }, [authLoading, user, load]);

  const handleConfirmMeal = useCallback(
    async (
      mealType: MealType,
      items: MealItem[],
      source: DataSource,
      mediaUploadId?: string
    ) => {
      if (!user) throw new Error("Not signed in.");
      const created = await queries.confirmMeal(
        supabase,
        user.id,
        mealType,
        items,
        source,
        mediaUploadId
      );
      setMeals((prev) => [created, ...prev]);
    },
    [supabase, user]
  );

  const refetch = useCallback(async () => {
    if (!user) return;
    await load(user.id);
  }, [user, load]);

  const value = useMemo<MealsContextValue>(
    () => ({
      meals,
      loading: authLoading || loading,
      error,
      confirmMeal: handleConfirmMeal,
      refetch,
    }),
    [meals, authLoading, loading, error, handleConfirmMeal, refetch]
  );

  return <MealsContext.Provider value={value}>{children}</MealsContext.Provider>;
}

export function useMeals() {
  const ctx = useContext(MealsContext);
  if (!ctx) throw new Error("useMeals must be used within MealsProvider");
  return ctx;
}
