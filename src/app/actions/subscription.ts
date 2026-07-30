"use server";

import { assignFreePlan } from "@/lib/subscription";

export async function assignFreePlanAction(userId: string) {
  try {
    await assignFreePlan(userId);
  } catch (error) {
    console.error("[Subscription] Error assigning free plan during onboarding:", error);
  }
}
