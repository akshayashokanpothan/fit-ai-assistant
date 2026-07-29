import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DietPreference,
  ExperienceLevel,
  Goal,
  Profile,
  TrainingEnvironment,
  TrainingFrequency,
} from "@/types";

/**
 * Raw shape of a row in `public.profiles` (snake_case, as Postgres/PostgREST
 * returns it). Mirrors supabase/migrations/0001_init.sql exactly — do not
 * add fields here that don't exist as columns in that table.
 */
interface ProfileRow {
  id: string;
  user_id: string;
  display_name: string | null;
  goal: Goal | null;
  age: number | null;
  sex: "male" | "female" | "other" | null;
  height_cm: number | null;
  weight_kg: number | null;
  experience: ExperienceLevel | null;
  environment: TrainingEnvironment | null;
  frequency_per_week: TrainingFrequency | null;
  diet_preference: DietPreference | null;
  diet_restrictions: string[] | null;
  limitations: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fields the app is allowed to write, in application (camelCase) shape.
 * Deliberately excludes `avatarUrl`: `public.profiles` has no avatar column
 * yet (Storage integration is a future phase, not part of Phase 2), so
 * avatar continues to be a demo-store-only concern for now — see the
 * Profile page for where that's intentionally kept separate.
 */
export interface ProfileWritable {
  displayName?: string | null;
  goal?: Goal | null;
  age?: number | null;
  sex?: "male" | "female" | "other" | null;
  heightCm?: number | null;
  weightKg?: number | null;
  experience?: ExperienceLevel | null;
  environment?: TrainingEnvironment | null;
  frequencyPerWeek?: TrainingFrequency | null;
  dietPreference?: DietPreference | null;
  limitations?: string | null;
}

function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    avatarUrl: null,
    goal: row.goal,
    age: row.age,
    sex: row.sex,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    experience: row.experience,
    environment: row.environment,
    frequencyPerWeek: row.frequency_per_week,
    dietPreference: row.diet_preference,
    dietRestrictions: row.diet_restrictions ?? [],
    limitations: row.limitations,
    onboardingCompletedAt: row.onboarding_completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function writableToRow(patch: ProfileWritable): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ("displayName" in patch) row.display_name = patch.displayName;
  if ("goal" in patch) row.goal = patch.goal;
  if ("age" in patch) row.age = patch.age;
  if ("sex" in patch) row.sex = patch.sex;
  if ("heightCm" in patch) row.height_cm = patch.heightCm;
  if ("weightKg" in patch) row.weight_kg = patch.weightKg;
  if ("experience" in patch) row.experience = patch.experience;
  if ("environment" in patch) row.environment = patch.environment;
  if ("frequencyPerWeek" in patch) row.frequency_per_week = patch.frequencyPerWeek;
  if ("dietPreference" in patch) row.diet_preference = patch.dietPreference;
  if ("limitations" in patch) row.limitations = patch.limitations;
  return row;
}

const POSTGRES_UNIQUE_VIOLATION = "23505";

/** Fetches the authenticated user's profile row, or null if none exists yet. */
export async function fetchProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return rowToProfile(data as ProfileRow);
}

/** Ensures the authenticated user has exactly one `public.profiles` row */
export async function ensureProfile(supabase: SupabaseClient, userId: string): Promise<Profile> {
  const existing = await fetchProfile(supabase, userId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("profiles")
    .insert({ user_id: userId })
    .select("*")
    .single();

  if (error) {
    if (error.code === POSTGRES_UNIQUE_VIOLATION) {
      const refetched = await fetchProfile(supabase, userId);
      if (refetched) return refetched;
    }
    throw new Error(error.message);
  }

  return rowToProfile(data as ProfileRow);
}

/** Updates the authenticated user's profile row, returning the updated profile. */
export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  patch: ProfileWritable
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update(writableToRow(patch))
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToProfile(data as ProfileRow);
}

/** Saves the submitted onboarding fields and marks onboarding complete */
export async function completeOnboarding(
  supabase: SupabaseClient,
  userId: string,
  patch: ProfileWritable
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...writableToRow(patch), onboarding_completed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToProfile(data as ProfileRow);
}
