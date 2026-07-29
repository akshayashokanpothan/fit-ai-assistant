import type { SupabaseClient } from "@supabase/supabase-js";
import type { Activity, ConfirmationState } from "@/types";

interface ActivityRow {
  id: string;
  user_id: string;
  source: "screenshot_ai" | "manual" | "seed";
  activity_type: string;
  steps: number | null;
  distance_km: number | null;
  active_kcal: number | null;
  duration_min: number | null;
  event_date: string;
  confidence: number;
  confirmation_state: ConfirmationState;
  media_upload_id: string | null;
  created_at: string;
}

function rowToActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    userId: row.user_id,
    source: row.source,
    activityType: row.activity_type,
    steps: row.steps ?? undefined,
    distanceKm: row.distance_km ?? undefined,
    activeKcal: row.active_kcal ?? undefined,
    durationMin: row.duration_min ?? undefined,
    eventDate: row.event_date,
    confidence: row.confidence,
    confirmationState: row.confirmation_state,
    mediaUploadId: row.media_upload_id ?? undefined,
    createdAt: row.created_at,
  };
}

export async function fetchAllActivities(
  supabase: SupabaseClient,
  userId: string
): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("user_id", userId)
    .order("event_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToActivity(row as unknown as ActivityRow));
}

export async function confirmActivity(
  supabase: SupabaseClient,
  userId: string,
  draft: Partial<Activity> & { activityType: string },
  source: "screenshot_ai" | "manual",
  mediaUploadId?: string
): Promise<Activity> {
  const { data, error } = await supabase
    .from("activities")
    .insert({
      user_id: userId,
      source,
      activity_type: draft.activityType,
      steps: draft.steps ?? null,
      distance_km: draft.distanceKm ?? null,
      active_kcal: draft.activeKcal ?? null,
      duration_min: draft.durationMin ?? null,
      event_date: draft.eventDate ?? new Date().toISOString().split("T")[0],
      confidence: draft.confidence ?? 1.0,
      confirmation_state: "confirmed",
      media_upload_id: mediaUploadId ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  return rowToActivity(data as unknown as ActivityRow);
}
