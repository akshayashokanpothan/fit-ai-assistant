"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useDemoStore } from "@/lib/demo/store";
import { createClient } from "@/utils/supabase/client";
import type { BodyMetric } from "@/types";

/**
 * Data Access Layer for Body Metrics.
 * Supports Supabase as primary, demo store as fallback.
 */
export function useBodyMetricsDAL() {
  const { user } = useAuth();
  const demoStore = useDemoStore();
  const supabase = useMemo(() => createClient(), []);

  const [dbBodyMetrics, setDbBodyMetrics] = useState<BodyMetric[]>([]);

  const bodyMetrics = user ? dbBodyMetrics : demoStore.state.bodyMetrics;

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDbBodyMetrics([]);
      return;
    }

    let isMounted = true;

    const fetchBodyMetrics = async () => {
      try {
        const { data, error } = await supabase
          .from("body_metrics")
          .select("*")
          .eq("user_id", user.id)
          .order("recorded_at", { ascending: false });

        if (error) {
          console.error("Error fetching body metrics", error);
        } else if (data && isMounted) {
          setDbBodyMetrics(
            data.map((row) => ({
              id: row.id,
              userId: row.user_id,
              weightKg: row.weight_kg,
              recordedAt: row.recorded_at,
            }))
          );
        }
      } catch (err) {
        console.error("Body metrics fetch error:", err);
      }
    };

    fetchBodyMetrics();

    return () => {
      isMounted = false;
    };
  }, [user, supabase]);

  const addBodyMetric = useCallback(
    async (weightKg: number) => {
      if (user) {
        const tempId = `bm-${Date.now()}`;
        const newMetric: BodyMetric = {
          id: tempId,
          userId: user.id,
          weightKg,
          recordedAt: new Date().toISOString(),
        };

        // Optimistic UI update
        setDbBodyMetrics((prev) => [newMetric, ...prev]);

        try {
          const { error } = await supabase.from("body_metrics").insert({
            user_id: user.id,
            weight_kg: weightKg,
          });

          if (error) throw error;
          
          // Re-fetch to get real UUID from db
          const { data, error: fetchError } = await supabase
            .from("body_metrics")
            .select("*")
            .eq("user_id", user.id)
            .order("recorded_at", { ascending: false });

          if (!fetchError && data) {
            setDbBodyMetrics(
              data.map((row) => ({
                id: row.id,
                userId: row.user_id,
                weightKg: row.weight_kg,
                recordedAt: row.recorded_at,
              }))
            );
          }
        } catch (err) {
          console.error("Failed to insert body metric:", err);
          // Rollback optimistic update
          setDbBodyMetrics((prev) => prev.filter((m) => m.id !== tempId));
        }
      } else {
        demoStore.addBodyMetric(weightKg);
      }
    },
    [user, demoStore, supabase]
  );

  return {
    bodyMetrics,
    addBodyMetric,
  };
}
