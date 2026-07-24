-- ─────────────────────────────────────────────────────────────────────────
-- Sahaay AI Fitness Companion — initial schema
-- Run via `supabase db push` or the Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ── profiles ────────────────────────────────────────────────────────────
-- One row per authenticated user. Source of truth for explicit user data —
-- must never be silently overwritten by derived AI memory.
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text,
  goal text check (goal in ('lose_weight', 'gain_muscle', 'maintain', 'general_fitness')),
  age smallint check (age between 10 and 100),
  sex text check (sex in ('male', 'female', 'other')),
  height_cm numeric(5, 1),
  weight_kg numeric(5, 1),
  experience text check (experience in ('new', 'beginner', 'intermediate', 'advanced')),
  environment text check (environment in ('gym', 'home', 'both')),
  frequency_per_week smallint check (frequency_per_week between 1 and 7),
  diet_preference text check (diet_preference in ('vegetarian', 'non_vegetarian', 'eggetarian', 'vegan')),
  diet_restrictions text[] not null default '{}',
  limitations text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_profiles_user_id on public.profiles (user_id);

-- ── conversations & messages ───────────────────────────────────────────
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_conversations_user_id on public.conversations (user_id, updated_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null default '',
  attachments jsonb not null default '[]',
  card jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation_id on public.messages (conversation_id, created_at);
create index if not exists idx_messages_user_id on public.messages (user_id);

-- ── media uploads (temporary, 24h retention) ───────────────────────────
create table if not exists public.media_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('food_image', 'fitness_screenshot')),
  storage_path text not null,
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processing', 'done', 'failed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  deleted_at timestamptz
);

create index if not exists idx_media_uploads_user_id on public.media_uploads (user_id);
create index if not exists idx_media_uploads_expires_at on public.media_uploads (expires_at) where deleted_at is null;

-- ── meals & meal items ──────────────────────────────────────────────────
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'snack', 'dinner', 'other')),
  event_time timestamptz not null default now(),
  source text not null check (source in ('image_ai', 'manual', 'screenshot_ai', 'seed')),
  confidence numeric(3, 2) not null default 1.0 check (confidence between 0 and 1),
  confirmation_state text not null default 'pending'
    check (confirmation_state in ('pending', 'confirmed', 'edited', 'rejected')),
  media_upload_id uuid references public.media_uploads (id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_meals_user_event on public.meals (user_id, event_time desc);

create table if not exists public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  name text not null,
  quantity_label text not null default '1 serving',
  kcal numeric(6, 1) not null default 0,
  protein_g numeric(5, 1) not null default 0,
  carbs_g numeric(5, 1) not null default 0,
  fat_g numeric(5, 1) not null default 0,
  fibre_g numeric(5, 1),
  sugar_g numeric(5, 1),
  sodium_mg numeric(6, 1),
  confidence numeric(3, 2) not null default 1.0 check (confidence between 0 and 1)
);

create index if not exists idx_meal_items_meal_id on public.meal_items (meal_id);

-- ── activity ────────────────────────────────────────────────────────────
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null check (source in ('screenshot_ai', 'manual', 'seed')),
  activity_type text not null default 'walk',
  steps integer,
  distance_km numeric(6, 2),
  active_kcal numeric(6, 1),
  duration_min integer,
  event_date date not null default current_date,
  confidence numeric(3, 2) not null default 1.0 check (confidence between 0 and 1),
  confirmation_state text not null default 'pending'
    check (confirmation_state in ('pending', 'confirmed', 'edited', 'rejected')),
  media_upload_id uuid references public.media_uploads (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_activities_user_date on public.activities (user_id, event_date desc);

-- ── exercise library (global reference data, not user-owned) ──────────
create table if not exists public.exercises (
  id text primary key,
  name text not null,
  primary_muscle text not null,
  secondary_muscles text[] not null default '{}',
  equipment text not null,
  difficulty text not null check (difficulty in ('new', 'beginner', 'intermediate', 'advanced')),
  instructions text[] not null default '{}',
  form_cues text[] not null default '{}',
  image_ref text,
  video_ref text
);

-- ── workouts, exercises-within-workout, sets ───────────────────────────
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  estimated_minutes integer not null default 45,
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'completed', 'skipped')),
  scheduled_for date not null default current_date,
  started_at timestamptz,
  completed_at timestamptz,
  perceived_difficulty text check (perceived_difficulty in ('easy', 'moderate', 'hard', 'very_hard')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_workouts_user_scheduled on public.workouts (user_id, scheduled_for desc);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id text not null references public.exercises (id),
  order_index smallint not null default 0,
  planned_sets jsonb not null default '[]' -- [{setNumber, targetRepsLow, targetRepsHigh}]
);

create index if not exists idx_workout_exercises_workout_id on public.workout_exercises (workout_id);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  set_number smallint not null,
  weight_kg numeric(6, 2),
  reps smallint,
  completed boolean not null default false,
  skipped boolean not null default false,
  note text
);

create index if not exists idx_workout_sets_we_id on public.workout_sets (workout_exercise_id);

-- ── plans (3-day) ───────────────────────────────────────────────────────
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'superseded')),
  created_at timestamptz not null default now()
);

create index if not exists idx_plans_user_id on public.plans (user_id, created_at desc);

create table if not exists public.plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  day_index smallint not null,
  date date not null,
  workout_title text,
  workout_id uuid references public.workouts (id) on delete set null,
  nutrition_target_kcal integer not null,
  protein_target_g integer not null,
  meal_suggestions text[] not null default '{}',
  activity_guidance text,
  completed boolean not null default false
);

create index if not exists idx_plan_items_plan_id on public.plan_items (plan_id);

-- ── body metrics ────────────────────────────────────────────────────────
create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  weight_kg numeric(5, 1) not null,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_body_metrics_user_id on public.body_metrics (user_id, recorded_at desc);

-- ── memory ──────────────────────────────────────────────────────────────
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  layer text not null check (layer in ('profile', 'daily', 'historical', 'derived')),
  key text not null,
  value text not null,
  confidence numeric(3, 2) not null default 0.5 check (confidence between 0 and 1),
  created_at timestamptz not null default now()
);

create index if not exists idx_memories_user_id on public.memories (user_id, layer);

-- ── usage metering ──────────────────────────────────────────────────────
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (
    type in ('ai_message', 'image_analysis', 'food_scan', 'screenshot_scan', 'plan_generation')
  ),
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_usage_events_user_id on public.usage_events (user_id, created_at desc);

-- ── minimal safety events (auditing only, no clinical data) ────────────
create table if not exists public.safety_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (
    category in ('emergency', 'disordered_eating', 'medical_advice', 'extreme_diet')
  ),
  created_at timestamptz not null default now()
);

create index if not exists idx_safety_events_user_id on public.safety_events (user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────
-- updated_at triggers
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.media_uploads enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.activities enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.plans enable row level security;
alter table public.plan_items enable row level security;
alter table public.body_metrics enable row level security;
alter table public.memories enable row level security;
alter table public.usage_events enable row level security;
alter table public.safety_events enable row level security;
alter table public.exercises enable row level security;

-- Direct user-owned tables: owner can select/insert/update/delete their own rows.
create policy "profiles_owner_all" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "conversations_owner_all" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "messages_owner_all" on public.messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "media_uploads_owner_all" on public.media_uploads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "meals_owner_all" on public.meals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "activities_owner_all" on public.activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "workouts_owner_all" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "plans_owner_all" on public.plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "body_metrics_owner_all" on public.body_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "memories_owner_all" on public.memories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "usage_events_owner_all" on public.usage_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "safety_events_owner_all" on public.safety_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Child tables scoped via their parent's ownership.
create policy "meal_items_owner_all" on public.meal_items
  for all
  using (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid()));

create policy "workout_exercises_owner_all" on public.workout_exercises
  for all
  using (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()))
  with check (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));

create policy "workout_sets_owner_all" on public.workout_sets
  for all
  using (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id and w.user_id = auth.uid()
    )
  );

create policy "plan_items_owner_all" on public.plan_items
  for all
  using (exists (select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid()));

-- Exercise library is global read-only reference data.
create policy "exercises_read_all" on public.exercises
  for select using (true);
