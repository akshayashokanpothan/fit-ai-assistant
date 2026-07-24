import { NextRequest, NextResponse } from "next/server";

/**
 * Deletes expired media (food images / fitness screenshots) that have passed
 * their 24h retention window. Confirmed structured data (meals, activities)
 * is never touched here — only the underlying media object and its row.
 *
 * This route is not wired to a live Supabase project in demo mode (there is
 * no persistent media store to clean up client-side). Once Supabase Storage
 * is configured, this becomes the real cleanup job. Schedule it with:
 *
 *   - Vercel Cron (see vercel.json): Vercel invokes this route with GET and,
 *     when a CRON_SECRET env var is set, automatically sends
 *     `Authorization: Bearer <CRON_SECRET>` — verified below.
 *   - or a Supabase scheduled Edge Function calling the same query directly.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      {
        skipped: true,
        reason: "Supabase not configured — nothing to clean up in demo mode.",
      },
      { status: 200 }
    );
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: expired, error: fetchError } = await admin
      .from("media_uploads")
      .select("id, storage_path, kind")
      .lt("expires_at", new Date().toISOString())
      .is("deleted_at", null);

    if (fetchError) throw fetchError;
    if (!expired || expired.length === 0) {
      return NextResponse.json({ deleted: 0 });
    }

    const byBucket: Record<string, string[]> = {};
    for (const row of expired) {
      const bucket = row.kind === "food_image" ? "food-images" : "fitness-screenshots";
      byBucket[bucket] = byBucket[bucket] ?? [];
      byBucket[bucket].push(row.storage_path);
    }

    for (const [bucket, paths] of Object.entries(byBucket)) {
      await admin.storage.from(bucket).remove(paths);
    }

    const ids = expired.map((r) => r.id);
    const { error: updateError } = await admin
      .from("media_uploads")
      .update({ deleted_at: new Date().toISOString(), processing_status: "done" })
      .in("id", ids);

    if (updateError) throw updateError;

    return NextResponse.json({ deleted: ids.length });
  } catch (err) {
    console.error("[/api/cron/cleanup-media] error", err);
    return NextResponse.json({ error: "cleanup_failed" }, { status: 500 });
  }
}
