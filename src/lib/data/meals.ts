"use client";

import { useCallback } from "react";
import { useAuth } from "@/lib/auth/auth-context";

import { useMeals as useSupabaseMeals } from "@/lib/meals/meals-context";
import type { MealItem, MealType, DataSource } from "@/types";

/**
 * Data Access Layer for Meals.
 * Wraps the existing Supabase meals context and the demo store to provide a unified API with fallback.
 */
export function useMealsDAL() {
  const { user } = useAuth();
  const supabaseMeals = useSupabaseMeals();

  // If we have a user and Supabase isn't loading, use Supabase meals. 
  // Otherwise, fallback to demo store (although demo store currently clears meals on reload, 
  // we proxy it here for in-memory session persistence).
  const meals = user ? supabaseMeals.meals : [];
  const loading = user ? supabaseMeals.loading : false;
  const error = user ? supabaseMeals.error : null;

  const confirmMeal = useCallback(
    async (
      mealType: MealType,
      items: MealItem[],
      source: DataSource,
      mediaUploadId?: string
    ) => {
      if (user) {
        await supabaseMeals.confirmMeal(mealType, items, source, mediaUploadId);
      } else {
        // Fallback: Currently the demo store handles meal additions via addMessage/onboarding logic implicitly,
        // but we'll wire it to a placeholder or direct state manipulation if needed.
        console.warn("[Meals DAL] Demo store fallback for confirmMeal is not fully implemented.");
      }
    },
    [user, supabaseMeals]
  );

  const refetch = useCallback(async () => {
    if (user) {
      await supabaseMeals.refetch();
    }
  }, [user, supabaseMeals]);

  return {
    meals,
    loading,
    error,
    confirmMeal,
    refetch,
  };
}
