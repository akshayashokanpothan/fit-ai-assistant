// ─────────────────────────────────────────────────────────────────────────
// Core domain types. Mirrors the Postgres schema in supabase/migrations.
// ─────────────────────────────────────────────────────────────────────────

export type Goal = "lose_weight" | "gain_muscle" | "maintain" | "general_fitness";

export type ExperienceLevel = "new" | "beginner" | "intermediate" | "advanced";

export type TrainingEnvironment = "gym" | "home" | "both";

export type TrainingFrequency = 2 | 3 | 4 | 5 | 6;

export type DietPreference =
  | "vegetarian"
  | "non_vegetarian"
  | "eggetarian"
  | "vegan";

export interface Profile {
  id: string;
  userId: string;
  displayName: string | null;
  // Optional profile photo. In demo mode this holds a resized, base64 data
  // URL persisted to localStorage. Once Supabase Storage is wired up this
  // will hold a Storage URL/path instead — no UI change required for that
  // transition, since consumers just render whatever string is here.
  avatarUrl?: string | null;
  avatarType?: "photo" | "avatar";
  goal: Goal | null;
  age: number | null;
  sex: "male" | "female" | "other" | null;
  heightCm: number | null;
  weightKg: number | null;
  experience: ExperienceLevel | null;
  environment: TrainingEnvironment | null;
  frequencyPerWeek: TrainingFrequency | null;
  dietPreference: DietPreference | null;
  dietRestrictions: string[];
  limitations: string | null;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Conversation ───────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "system";

export interface MessageAttachment {
  id: string;
  kind: "image";
  mediaUploadId: string;
  previewUrl: string;
  status: "uploading" | "processing" | "ready" | "failed" | "expired";
}

export interface StructuredCard {
  kind:
    | "meal_review"
    | "activity_review"
    | "workout_preview"
    | "plan_preview"
    | "today_summary"
    | "safety_notice";
  data: unknown;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  attachments?: MessageAttachment[];
  card?: StructuredCard;
  createdAt: string;
  status?: "sending" | "sent" | "failed";
}

export interface Conversation {
  id: string;
  userId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Nutrition / meals ──────────────────────────────────────────────────

export type MealType = "breakfast" | "lunch" | "snack" | "dinner" | "other";

export type DataSource = "image_ai" | "manual" | "screenshot_ai" | "seed";

export type ConfirmationState = "pending" | "confirmed" | "edited" | "rejected";

export interface NutritionEstimate {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG?: number;
  sugarG?: number;
  sodiumMg?: number;
}

export interface MealItem {
  id: string;
  name: string;
  quantityLabel: string; // e.g. "2 pieces", "1 bowl"
  nutrition: NutritionEstimate;
  confidence: number; // 0..1
}

export interface Meal {
  id: string;
  userId: string;
  mealType: MealType;
  eventTime: string;
  items: MealItem[];
  totalNutrition: NutritionEstimate;
  source: DataSource;
  confidence: number;
  confirmationState: ConfirmationState;
  mediaUploadId?: string | null;
  notes?: string;
  createdAt: string;
}

// ── Activity ────────────────────────────────────────────────────────────

export interface Activity {
  id: string;
  userId: string;
  source: "screenshot_ai" | "manual" | "seed";
  activityType: string; // e.g. "walk", "run", "cycling", "steps"
  steps?: number;
  distanceKm?: number;
  activeKcal?: number;
  durationMin?: number;
  eventDate: string;
  confidence: number;
  confirmationState: ConfirmationState;
  mediaUploadId?: string | null;
  createdAt: string;
}

// ── Exercise library ────────────────────────────────────────────────────

export type Equipment =
  | "bodyweight"
  | "dumbbell"
  | "barbell"
  | "cable"
  | "machine"
  | "resistance_band"
  | "cardio_machine";

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core"
  | "full_body"
  | "cardio";

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  difficulty: ExperienceLevel;
  instructions: string[];
  formCues: string[];
  imageRef: string; // reference image key (curated/placeholder)
  videoRef?: string;
}

// ── Workouts ────────────────────────────────────────────────────────────

export interface PlannedSet {
  setNumber: number;
  targetRepsLow: number;
  targetRepsHigh: number;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  order: number;
  plannedSets: PlannedSet[];
}

export interface LoggedSet {
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  completed: boolean;
  skipped: boolean;
  note?: string;
}

export interface WorkoutSetLog {
  workoutExerciseId: string;
  sets: LoggedSet[];
  difficulty?: "easy" | "moderate" | "hard" | "very_hard";
  skippedExercise?: boolean;
}

export type WorkoutStatus = "planned" | "in_progress" | "completed" | "skipped";

export interface Workout {
  id: string;
  userId: string;
  title: string; // e.g. "Upper Body"
  estimatedMinutes: number;
  status: WorkoutStatus;
  scheduledFor: string; // date
  exercises: WorkoutExercise[];
  logs: WorkoutSetLog[];
  startedAt?: string;
  completedAt?: string;
  perceivedDifficulty?: "easy" | "moderate" | "hard" | "very_hard";
  note?: string;
  createdAt: string;
}

// ── Plans (3-day) ───────────────────────────────────────────────────────

export interface PlanDay {
  dayIndex: number; // 0,1,2
  date: string;
  workoutTitle: string | null; // null => recovery day
  workoutId?: string;
  nutritionTargetKcal: number;
  proteinTargetG: number;
  mealSuggestions: string[];
  activityGuidance: string;
  completed: boolean;
}

export interface Plan {
  id: string;
  userId: string;
  createdAt: string;
  days: PlanDay[];
  status: "active" | "superseded";
}

// ── Body metrics ────────────────────────────────────────────────────────

export interface BodyMetric {
  id: string;
  userId: string;
  weightKg: number;
  recordedAt: string;
}

// ── Memory ──────────────────────────────────────────────────────────────

export type MemoryLayer = "profile" | "daily" | "historical" | "derived";

export interface MemoryFact {
  id: string;
  userId: string;
  layer: MemoryLayer;
  key: string;
  value: string;
  confidence: number;
  createdAt: string;
}

// ── Media ───────────────────────────────────────────────────────────────

export interface MediaUpload {
  id: string;
  userId: string;
  kind: "food_image" | "fitness_screenshot";
  url: string;
  processingStatus: "pending" | "processing" | "done" | "failed";
  createdAt: string;
  expiresAt: string;
  deletedAt: string | null;
}

// ── Usage metering ──────────────────────────────────────────────────────

export type UsageEventType =
  | "ai_message"
  | "image_analysis"
  | "food_scan"
  | "screenshot_scan"
  | "plan_generation";

export interface UsageEvent {
  id: string;
  userId: string;
  type: UsageEventType;
  createdAt: string;
  meta?: Record<string, unknown>;
}

// ── Derived / computed context passed to AI ─────────────────────────────

export interface DailyNutritionSummary {
  date: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  targetKcal: number;
  targetProteinG: number;
}

export interface AIContext {
  profile: Profile;
  goalTargets: { kcal: number; proteinG: number };
  today: {
    meals: Meal[];
    activities: Activity[];
    workout: Workout | null;
    nutrition: DailyNutritionSummary;
  };
  recentWorkouts: Workout[];
  recentMeals: Meal[];
  currentPlan: Plan | null;
  recentBodyMetrics: BodyMetric[];
  derivedMemory: MemoryFact[];
}
