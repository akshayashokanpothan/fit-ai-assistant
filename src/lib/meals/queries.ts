import type { SupabaseClient } from "@supabase/supabase-js";
import type { Meal, MealItem, MealType, DataSource, ConfirmationState } from "@/types";
import { sumNutrition } from "@/lib/nutrition/seed-foods";

interface MealItemRow {
  id: string;
  meal_id: string;
  name: string;
  quantity_label: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  confidence: number;
}

interface MealRow {
  id: string;
  user_id: string;
  meal_type: MealType;
  event_time: string;
  source: DataSource;
  confidence: number;
  confirmation_state: ConfirmationState;
  media_upload_id: string | null;
  notes: string | null;
  created_at: string;
  total_kcal: number | null;
  total_protein_g: number | null;
  total_carbs_g: number | null;
  total_fat_g: number | null;
  meal_items?: MealItemRow[];
}

const MEAL_SELECT = "*, meal_items(*)";

function rowToMeal(row: MealRow): Meal {
  const items: MealItem[] = (row.meal_items ?? []).map((i) => ({
    id: i.id,
    name: i.name,
    quantityLabel: i.quantity_label,
    nutrition: {
      kcal: i.kcal,
      proteinG: i.protein_g,
      carbsG: i.carbs_g,
      fatG: i.fat_g,
      fibreG: i.fibre_g ?? undefined,
      sugarG: i.sugar_g ?? undefined,
      sodiumMg: i.sodium_mg ?? undefined,
    },
    confidence: i.confidence,
  }));

  return {
    id: row.id,
    userId: row.user_id,
    mealType: row.meal_type,
    eventTime: row.event_time,
    items,
    totalNutrition: {
      kcal: row.total_kcal ?? 0,
      proteinG: row.total_protein_g ?? 0,
      carbsG: row.total_carbs_g ?? 0,
      fatG: row.total_fat_g ?? 0,
    },
    source: row.source,
    confidence: row.confidence,
    confirmationState: row.confirmation_state,
    mediaUploadId: row.media_upload_id ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export async function fetchAllMeals(
  supabase: SupabaseClient,
  userId: string
): Promise<Meal[]> {
  const { data, error } = await supabase
    .from("meals")
    .select(MEAL_SELECT)
    .eq("user_id", userId)
    .order("event_time", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToMeal(row as unknown as MealRow));
}

export async function confirmMeal(
  supabase: SupabaseClient,
  userId: string,
  mealType: MealType,
  items: MealItem[],
  source: DataSource,
  mediaUploadId?: string
): Promise<Meal> {
  const totalNutrition = sumNutrition(items.map((i) => i.nutrition));
  const confidence =
    items.length > 0
      ? items.reduce((a, i) => a + i.confidence, 0) / items.length
      : 1.0;

  const { data: mealRow, error: mealError } = await supabase
    .from("meals")
    .insert({
      user_id: userId,
      meal_type: mealType,
      event_time: new Date().toISOString(),
      source,
      confidence,
      confirmation_state: "confirmed",
      media_upload_id: mediaUploadId ?? null,
      total_kcal: totalNutrition.kcal,
      total_protein_g: totalNutrition.proteinG,
      total_carbs_g: totalNutrition.carbsG,
      total_fat_g: totalNutrition.fatG,
    })
    .select("*")
    .single();

  if (mealError) throw new Error(mealError.message);

  const itemInserts = items.map((i) => ({
    meal_id: mealRow.id,
    name: i.name,
    quantity_label: i.quantityLabel,
    kcal: i.nutrition.kcal,
    protein_g: i.nutrition.proteinG,
    carbs_g: i.nutrition.carbsG,
    fat_g: i.nutrition.fatG,
    fibre_g: i.nutrition.fibreG ?? null,
    sugar_g: i.nutrition.sugarG ?? null,
    sodium_mg: i.nutrition.sodiumMg ?? null,
    confidence: i.confidence,
  }));

  const { data: itemRows, error: itemsError } =
    itemInserts.length > 0
      ? await supabase.from("meal_items").insert(itemInserts).select("*")
      : { data: [], error: null };

  if (itemsError) throw new Error(itemsError.message);

  return rowToMeal({ ...mealRow, meal_items: itemRows });
}
