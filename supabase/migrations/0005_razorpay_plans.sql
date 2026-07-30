-- ─────────────────────────────────────────────────────────────────────────
-- Pace AI Monetization Phase 2: Razorpay Integration
-- ─────────────────────────────────────────────────────────────────────────

-- Add provider_plan_id to subscription_plans so we can map internal plans
-- to Razorpay plan IDs (e.g., 'plan_xyz123')
alter table public.subscription_plans
  add column if not exists provider_plan_id text;

-- Update seed plans with example Razorpay plan IDs
-- (These will need to be updated with actual IDs from the Razorpay dashboard)
update public.subscription_plans
set provider_plan_id = 'plan_pro_placeholder'
where name = 'Pro';

update public.subscription_plans
set provider_plan_id = 'plan_pro_plus_placeholder'
where name = 'Pro+';
