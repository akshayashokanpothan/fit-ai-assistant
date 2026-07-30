-- ─────────────────────────────────────────────────────────────────────────
-- Pace AI Monetization Phase 1: Plans, Entitlements & Usage Limits
-- ─────────────────────────────────────────────────────────────────────────

-- ── subscription_plans ─────────────────────────────────────────────────
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price numeric(10, 2) not null default 0,
  currency text not null default 'INR',
  meal_analysis_daily_limit integer not null default 3,
  chat_daily_limit integer not null default 20,
  workout_weekly_limit integer not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Note: -1 means unlimited

-- Insert default seed plans
insert into public.subscription_plans (id, name, price, currency, meal_analysis_daily_limit, chat_daily_limit, workout_weekly_limit)
values 
  ('a0000000-0000-0000-0000-000000000000', 'Free', 0, 'INR', 3, 20, 3),
  ('a0000000-0000-0000-0000-000000000001', 'Pro', 299, 'INR', 15, 100, -1),
  ('a0000000-0000-0000-0000-000000000002', 'Pro+', 599, 'INR', 30, 250, -1)
on conflict (name) do update 
set 
  price = excluded.price,
  meal_analysis_daily_limit = excluded.meal_analysis_daily_limit,
  chat_daily_limit = excluded.chat_daily_limit,
  workout_weekly_limit = excluded.workout_weekly_limit;


-- ── user_subscriptions ─────────────────────────────────────────────────
create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null references public.subscription_plans (id) on delete restrict,
  status text not null check (status in ('active', 'past_due', 'canceled', 'unpaid', 'trialing')),
  provider text, -- e.g., 'razorpay'
  provider_subscription_id text,
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id) -- one active subscription per user (can be modified later if needed)
);

create index if not exists idx_user_subscriptions_user_id on public.user_subscriptions (user_id);


-- ── usage_tracking ─────────────────────────────────────────────────────
create table if not exists public.usage_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  feature text not null check (feature in ('meal_analysis', 'ai_message', 'workout_generation', 'meal_plan_generation')),
  period_type text not null check (period_type in ('daily', 'weekly', 'monthly')),
  usage_date date not null default current_date, -- Start date of the period (e.g., beginning of the day/week)
  count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, feature, period_type, usage_date)
);

create index if not exists idx_usage_tracking_user_feature_date on public.usage_tracking (user_id, feature, usage_date);


-- ─────────────────────────────────────────────────────────────────────────
-- updated_at triggers
-- ─────────────────────────────────────────────────────────────────────────

drop trigger if exists trg_subscription_plans_updated_at on public.subscription_plans;
create trigger trg_subscription_plans_updated_at
  before update on public.subscription_plans
  for each row execute function public.set_updated_at();

drop trigger if exists trg_user_subscriptions_updated_at on public.user_subscriptions;
create trigger trg_user_subscriptions_updated_at
  before update on public.user_subscriptions
  for each row execute function public.set_updated_at();

drop trigger if exists trg_usage_tracking_updated_at on public.usage_tracking;
create trigger trg_usage_tracking_updated_at
  before update on public.usage_tracking
  for each row execute function public.set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────

alter table public.subscription_plans enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.usage_tracking enable row level security;

-- Plans are read-only for all users (even unauthenticated, so they can see pricing)
create policy "subscription_plans_read_all" on public.subscription_plans
  for select using (true);

-- Users can read their own subscriptions
create policy "user_subscriptions_owner_read" on public.user_subscriptions
  for select using (auth.uid() = user_id);

-- Users can read their own usage tracking
create policy "usage_tracking_owner_read" on public.usage_tracking
  for select using (auth.uid() = user_id);

-- Users shouldn't be inserting/updating their own limits or subscriptions directly
-- This will be handled securely via backend API using service role keys.
