import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan, PlanDay } from "@/types";

interface PlanItemRow {
  id: string;
  plan_id: string;
  day_index: number;
  date: string;
  workout_title: string | null;
  workout_id: string | null;
  nutrition_target_kcal: number;
  protein_target_g: number;
  meal_suggestions: string[];
  activity_guidance: string | null;
  completed: boolean;
}

interface PlanRow {
  id: string;
  user_id: string;
  status: "active" | "superseded";
  created_at: string;
  plan_items?: PlanItemRow[];
}

function rowToPlan(row: PlanRow): Plan {
  const days: PlanDay[] = (row.plan_items ?? []).map((i) => ({
    dayIndex: i.day_index,
    date: i.date,
    workoutTitle: i.workout_title,
    workoutId: i.workout_id ?? undefined,
    nutritionTargetKcal: i.nutrition_target_kcal,
    proteinTargetG: i.protein_target_g,
    mealSuggestions: i.meal_suggestions ?? [],
    activityGuidance: i.activity_guidance ?? "",
    completed: i.completed,
  }));

  // Ensure days are sorted correctly
  days.sort((a, b) => a.dayIndex - b.dayIndex);

  return {
    id: row.id,
    userId: row.user_id,
    createdAt: row.created_at,
    status: row.status,
    days,
  };
}

export async function fetchPlans(
  supabase: SupabaseClient,
  userId: string
): Promise<Plan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("*, plan_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToPlan(row as unknown as PlanRow));
}

export async function createPlan(
  supabase: SupabaseClient,
  userId: string,
  plan: Plan
): Promise<Plan> {
  // First supersede existing active plans
  await supabase
    .from("plans")
    .update({ status: "superseded" })
    .eq("user_id", userId)
    .eq("status", "active");

  const { data: planRow, error: planError } = await supabase
    .from("plans")
    .insert({
      user_id: userId,
      status: "active",
    })
    .select("*")
    .single();

  if (planError) throw new Error(planError.message);

  const itemInserts = plan.days.map((d) => ({
    plan_id: planRow.id,
    day_index: d.dayIndex,
    date: d.date,
    workout_title: d.workoutTitle,
    workout_id: null, // Intentionally left unpopulated as per Phase 5A rules
    nutrition_target_kcal: d.nutritionTargetKcal,
    protein_target_g: d.proteinTargetG,
    meal_suggestions: d.mealSuggestions,
    activity_guidance: d.activityGuidance,
    completed: d.completed ?? false,
  }));

  const { data: itemRows, error: itemsError } =
    itemInserts.length > 0
      ? await supabase.from("plan_items").insert(itemInserts).select("*")
      : { data: [], error: null };

  if (itemsError) {
    // If the child items fail, the plan is stranded, but this is an MVP sequential insert pattern.
    // In production, we'd wrap this in a Supabase RPC.
    throw new Error(itemsError.message);
  }

  return rowToPlan({ ...(planRow as unknown as PlanRow), plan_items: itemRows as PlanItemRow[] });
}

export async function markPlanDayComplete(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
  dayIndex: number
): Promise<void> {
  // RLS ensures only the owner can update this via the parent relationship, but we also just update directly
  const { error } = await supabase
    .from("plan_items")
    .update({ completed: true })
    .eq("plan_id", planId)
    .eq("day_index", dayIndex);

  if (error) throw new Error(error.message);
}
