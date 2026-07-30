"use server";

import { getUserPlan } from "@/lib/subscription";

export async function getUserPlanAction(userId: string) {
  try {
    const plan = await getUserPlan(userId);
    return plan;
  } catch (error) {
    console.error("[Subscription] Error fetching plan:", error);
    return null;
  }
}
