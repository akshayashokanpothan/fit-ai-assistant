import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, planName } = await req.json();

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature || !planName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    if (!keySecret) {
      console.error("[/api/payment/verify-subscription] Missing RAZORPAY_KEY_SECRET");
      return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }

    // Razorpay signature for subscription is generated using:
    // razorpay_payment_id + "|" + razorpay_subscription_id
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(razorpay_payment_id + "|" + razorpay_subscription_id)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      console.error("[/api/payment/verify-subscription] Signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the plan ID to update
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("id")
      .eq("name", planName)
      .single();

    if (planError || !plan) {
      console.error("[/api/payment/verify-subscription] Plan not found", planError);
      return NextResponse.json({ error: "Plan not found" }, { status: 400 });
    }

    // Update user_subscriptions using Service Role key
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    
    // We must use the service role key here to bypass RLS for updating another table
    const serviceClient = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: existingSub } = await serviceClient
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingSub) {
      await serviceClient
        .from("user_subscriptions")
        .update({
          plan_id: plan.id,
          status: "active",
          provider: "razorpay",
          provider_subscription_id: razorpay_subscription_id
        })
        .eq("id", existingSub.id);
    } else {
      await serviceClient
        .from("user_subscriptions")
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          status: "active",
          provider: "razorpay",
          provider_subscription_id: razorpay_subscription_id
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[/api/payment/verify-subscription] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
