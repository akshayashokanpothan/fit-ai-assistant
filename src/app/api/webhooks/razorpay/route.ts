import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// We must use the service role key here to bypass RLS since Webhooks 
// do not have the user's auth context.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(bodyText)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(bodyText);

    // Only process subscription events
    if (event.event.startsWith("subscription.")) {
      const subscription = event.payload.subscription.entity;
      
      const providerSubscriptionId = subscription.id;
      const status = subscription.status; // active, halted, cancelled, completed, authenticated
      const notes = subscription.notes || {};
      
      const userId = notes.userId;
      const planId = notes.planId;

      if (!userId || !planId) {
        console.warn(`[Razorpay Webhook] Missing userId or planId in notes for sub: ${providerSubscriptionId}`);
        return NextResponse.json({ status: "ok" }); // Ack but ignore
      }

      // Map Razorpay statuses to our schema statuses:
      // ('active', 'past_due', 'canceled', 'unpaid', 'trialing')
      let dbStatus = "active";
      if (status === "halted" || status === "cancelled" || status === "completed") {
        dbStatus = "canceled"; // Downgrade back to Free via our logic or just mark canceled
      } else if (status === "authenticated" || status === "pending") {
        dbStatus = "unpaid";
      }

      // Upsert user_subscriptions using the service role key
      const { data: existingSub } = await supabase
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingSub) {
        // If it's canceled, we can either update this to canceled, or if we want them to fall back to Free, 
        // we can assign them the Free plan directly. Let's just update the status to canceled so `getUserPlan` 
        // falls back to Free automatically.
        await supabase
          .from("user_subscriptions")
          .update({
            plan_id: dbStatus === "canceled" ? undefined : planId, // Let them keep their plan ID but mark canceled, or switch to free
            status: dbStatus,
            provider: "razorpay",
            provider_subscription_id: providerSubscriptionId
          })
          .eq("id", existingSub.id);
          
        if (dbStatus === "canceled") {
           // Safely assign free plan on cancellation
           const { data: freePlan } = await supabase.from("subscription_plans").select("id").eq("name", "Free").single();
           if (freePlan) {
              await supabase.from("user_subscriptions").update({
                plan_id: freePlan.id,
                status: "active",
                provider: null,
                provider_subscription_id: null
              }).eq("id", existingSub.id);
           }
        }
      } else {
        // Just in case no subscription exists yet
        await supabase
          .from("user_subscriptions")
          .insert({
            user_id: userId,
            plan_id: planId,
            status: dbStatus,
            provider: "razorpay",
            provider_subscription_id: providerSubscriptionId
          });
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[Razorpay Webhook Error]:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
