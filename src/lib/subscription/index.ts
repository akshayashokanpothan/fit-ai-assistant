import { createClient } from "@supabase/supabase-js";
import { endOfDay, startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

// Use service role key to bypass RLS for critical entitlement checks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase admin environment variables.");
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  meal_analysis_daily_limit: number;
  chat_daily_limit: number;
  workout_weekly_limit: number;
}

export type FeatureKey = "meal_analysis" | "ai_message" | "workout_generation" | "meal_plan_generation";

export async function getUserPlan(userId: string): Promise<Plan> {
  const supabase = getSupabaseAdmin();
  
  // Get active subscription
  const { data: sub, error: subError } = await supabase
    .from("user_subscriptions")
    .select("plan_id, status")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  if (subError) {
    console.error(`[Subscription] Failed to fetch subscription for ${userId}:`, subError);
  }

  // Get the actual plan details
  if (sub?.plan_id) {
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", sub.plan_id)
      .single();
      
    if (plan && !planError) return plan as Plan;
  }

  // Fallback to Free plan if none exists or query fails
  const { data: freePlan, error: freeError } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("name", "Free")
    .single();

  if (freeError || !freePlan) {
    console.error("[Subscription] CRITICAL: Failed to load Free plan from database.");
    // Absolute worst-case fallback
    return {
      id: "a0000000-0000-0000-0000-000000000000",
      name: "Free",
      price: 0,
      currency: "INR",
      meal_analysis_daily_limit: 3,
      chat_daily_limit: 20,
      workout_weekly_limit: 3,
    };
  }

  return freePlan as Plan;
}

function getPeriodSettings(feature: FeatureKey) {
  const now = new Date();
  
  if (feature === "workout_generation") {
    return {
      periodType: "weekly",
      usageDate: startOfWeek(now, { weekStartsOn: 1 }).toISOString(), // Monday start
    };
  }
  
  // Default to daily for meal analysis and chat
  return {
    periodType: "daily",
    usageDate: startOfDay(now).toISOString(),
  };
}

export async function checkFeatureLimit(
  userId: string,
  feature: FeatureKey
): Promise<{ allowed: boolean; limit: number; currentUsage: number }> {
  const plan = await getUserPlan(userId);
  
  let limit = -1;
  if (feature === "meal_analysis") limit = plan.meal_analysis_daily_limit;
  if (feature === "ai_message") limit = plan.chat_daily_limit;
  if (feature === "workout_generation") limit = plan.workout_weekly_limit;
  
  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, limit, currentUsage: 0 };
  }

  const { periodType, usageDate } = getPeriodSettings(feature);
  const supabase = getSupabaseAdmin();

  const { data: usage, error } = await supabase
    .from("usage_tracking")
    .select("count")
    .eq("user_id", userId)
    .eq("feature", feature)
    .eq("period_type", periodType)
    .eq("usage_date", usageDate.split("T")[0])
    .maybeSingle();

  if (error) {
    console.error(`[Subscription] Failed to fetch usage for ${userId} (${feature}):`, error);
    // Deny by default on DB error to prevent abuse, or allow if we want graceful degradation
    return { allowed: false, limit, currentUsage: limit };
  }

  const currentUsage = usage?.count || 0;
  
  return {
    allowed: currentUsage < limit,
    limit,
    currentUsage
  };
}

export async function incrementUsage(userId: string, feature: FeatureKey): Promise<void> {
  const { periodType, usageDate } = getPeriodSettings(feature);
  const dateStr = usageDate.split("T")[0];
  const supabase = getSupabaseAdmin();

  // In Supabase, we can use an upsert/rpc, but due to PostgREST limitations on atomic increments, 
  // we can use a basic select-then-upsert for this phase.
  // In a high concurrency environment, an RPC function is preferred.
  
  const { data: usage } = await supabase
    .from("usage_tracking")
    .select("id, count")
    .eq("user_id", userId)
    .eq("feature", feature)
    .eq("period_type", periodType)
    .eq("usage_date", dateStr)
    .maybeSingle();

  if (usage) {
    await supabase
      .from("usage_tracking")
      .update({ count: usage.count + 1 })
      .eq("id", usage.id);
  } else {
    await supabase
      .from("usage_tracking")
      .insert({
        user_id: userId,
        feature,
        period_type: periodType,
        usage_date: dateStr,
        count: 1
      });
  }
}

export async function assignFreePlan(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  
  // Check if they already have a sub
  const { data: existing } = await supabase
    .from("user_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
    
  if (existing) return;

  const { data: freePlan } = await supabase
    .from("subscription_plans")
    .select("id")
    .eq("name", "Free")
    .single();

  if (!freePlan) return;

  await supabase
    .from("user_subscriptions")
    .insert({
      user_id: userId,
      plan_id: freePlan.id,
      status: "active",
    });
}
