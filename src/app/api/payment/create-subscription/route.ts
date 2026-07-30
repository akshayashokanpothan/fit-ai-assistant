import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import Razorpay from "razorpay";

export async function POST(req: NextRequest) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID || "";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    
    console.log("[/api/payment/create-subscription] Debug Info:");
    console.log("RAZORPAY_KEY_ID exists:", !!keyId);
    console.log("RAZORPAY_KEY_SECRET exists:", !!keySecret);
    console.log("RAZORPAY_KEY_ID (first 12):", keyId.substring(0, 12));

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    // Ensure user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planName } = await req.json();
    if (!planName) {
      return NextResponse.json({ error: "Plan name is required" }, { status: 400 });
    }

    // Since we are checking plans via Service Role in subscription index, 
    // we can also just fetch it here via normal client since plans are readable by all.
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("id, provider_plan_id")
      .eq("name", planName)
      .single();

    if (planError || !plan) {
      console.error("[/api/payment/create-subscription] Failed to find plan:", planError);
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (!plan.provider_plan_id) {
      return NextResponse.json(
        { error: "This plan is not configured for payments yet." },
        { status: 400 }
      );
    }

    // Create Razorpay Subscription
    console.log("[/api/payment/create-subscription] Creating subscription for:");
    console.log("Plan Name:", planName);
    console.log("Provider Plan ID:", plan.provider_plan_id);

    const subscriptionParams = {
      plan_id: plan.provider_plan_id,
      customer_notify: 1,
      total_count: 120, // max 10 years of monthly subs
      notes: {
        userId: user.id,
        planId: plan.id,
        planName: planName
      }
    };

    const subscription = await razorpay.subscriptions.create(subscriptionParams);

    return NextResponse.json({
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error("[/api/payment/create-subscription] Error:", error);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
