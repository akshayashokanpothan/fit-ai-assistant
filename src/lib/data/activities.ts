"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useDemoStore } from "@/lib/demo/store";
import { createClient } from "@/utils/supabase/client";
import type { Activity } from "@/types";
import * as queries from "@/lib/activities/queries";

/**
 * Data Access Layer for Activities.
 * Supports Supabase as primary, demo store as fallback.
 */
export function useActivitiesDAL() {
  const { user } = useAuth();
  const demoStore = useDemoStore();
  const supabase = useMemo(() => createClient(), []);

  const [dbActivities, setDbActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activities = user ? dbActivities : demoStore.state.activities;

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDbActivities([]);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchActivities = async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await queries.fetchAllActivities(supabase, user.id);
        if (isMounted) {
          setDbActivities(rows);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Couldn't load your activities.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchActivities();

    return () => {
      isMounted = false;
    };
  }, [user, supabase]);

  const confirmActivity = useCallback(
    async (
      draft: Partial<Activity> & { activityType: string },
      source: "screenshot_ai" | "manual",
      mediaUploadId?: string
    ) => {
      if (user) {
        // We use the existing queries helper, which handles the exact payload for Supabase
        const created = await queries.confirmActivity(
          supabase,
          user.id,
          draft,
          source,
          mediaUploadId
        );
        // Optimistic UI update for the newly added item
        setDbActivities((prev) => [created, ...prev]);
      } else {
        // Fallback to demo mode
        const newActivity: Activity = {
          id: `activity-${Date.now()}`,
          userId: demoStore.state.profile.userId,
          source,
          activityType: draft.activityType,
          steps: draft.steps,
          distanceKm: draft.distanceKm,
          activeKcal: draft.activeKcal,
          durationMin: draft.durationMin,
          eventDate: draft.eventDate || new Date().toISOString(),
          confidence: draft.confidence || 1,
          confirmationState: "confirmed",
          mediaUploadId: mediaUploadId || null,
          createdAt: new Date().toISOString(),
        };
        demoStore.addActivity(newActivity);
      }
    },
    [user, supabase, demoStore]
  );

  const refetch = useCallback(async () => {
    if (!user) return;
    try {
      const rows = await queries.fetchAllActivities(supabase, user.id);
      setDbActivities(rows);
    } catch (e) {
      console.error("Refetch failed:", e);
    }
  }, [user, supabase]);

  return {
    activities,
    loading,
    error,
    confirmActivity,
    refetch,
  };
}
