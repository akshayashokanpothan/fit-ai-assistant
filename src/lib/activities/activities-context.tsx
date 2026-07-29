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
import type { Activity } from "@/types";
import * as queries from "./queries";

interface ActivitiesContextValue {
  activities: Activity[];
  loading: boolean;
  error: string | null;
  confirmActivity: (
    draft: Partial<Activity> & { activityType: string },
    source: "screenshot_ai" | "manual",
    mediaUploadId?: string
  ) => Promise<void>;
  refetch: () => Promise<void>;
}

const ActivitiesContext = createContext<ActivitiesContextValue | null>(null);

/**
 * Supabase-backed activity state. Migrated off the demo store in Phase 5B.
 */
export function ActivitiesProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (userId: string) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const rows = await queries.fetchAllActivities(supabase, userId);
        if (requestIdRef.current !== requestId) return;
        setActivities(rows);
      } catch (err) {
        if (requestIdRef.current !== requestId) return;
        setError(err instanceof Error ? err.message : "Couldn't load your activities.");
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
        setActivities([]);
        setError(null);
        setLoading(false);
      }, 0);
      return;
    }
    load(user.id);
  }, [authLoading, user, load]);

  const handleConfirmActivity = useCallback(
    async (
      draft: Partial<Activity> & { activityType: string },
      source: "screenshot_ai" | "manual",
      mediaUploadId?: string
    ) => {
      if (!user) throw new Error("Not signed in.");
      const created = await queries.confirmActivity(
        supabase,
        user.id,
        draft,
        source,
        mediaUploadId
      );
      setActivities((prev) => [created, ...prev]);
    },
    [supabase, user]
  );

  const refetch = useCallback(async () => {
    if (!user) return;
    await load(user.id);
  }, [user, load]);

  const value = useMemo<ActivitiesContextValue>(
    () => ({
      activities,
      loading: authLoading || loading,
      error,
      confirmActivity: handleConfirmActivity,
      refetch,
    }),
    [activities, authLoading, loading, error, handleConfirmActivity, refetch]
  );

  return <ActivitiesContext.Provider value={value}>{children}</ActivitiesContext.Provider>;
}

export function useActivities() {
  const ctx = useContext(ActivitiesContext);
  if (!ctx) throw new Error("useActivities must be used within ActivitiesProvider");
  return ctx;
}
