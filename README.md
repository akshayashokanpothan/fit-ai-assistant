# Sahaay — AI Fitness Companion

A mobile-first, conversational AI fitness companion for beginners, built
India-first. Conversation is the primary surface — meals, workouts, and
activity are logged and reviewed through chat, with a light structured UI
(Today / History / Profile) alongside it.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4** with a custom design token system (`src/app/globals.css`)
- **Supabase** (Postgres, Auth, Storage) — schema included, optional for demo mode
- Self-hosted fonts (`@fontsource`) — Fraunces (display), Inter (body), IBM Plex Mono (data)
- No external UI kit dependency; primitives in `src/components/ui` follow shadcn/ui conventions

## Demo mode (default — no setup required)

The app is fully explorable with **zero configuration**. With no environment
variables set:

- Onboarding, chat, meal/activity logging, workout tracking, plans, history,
  and profile editing all work.
- All state is persisted to `localStorage` via a client-side demo store
  (`src/lib/demo/store.tsx`) standing in for the database.
- AI responses come from a deterministic **mock provider**
  (`src/lib/ai/mock-provider.ts`) — no API key needed.
- Food-image and fitness-screenshot analysis return plausible, rotating
  Indian-meal / activity detections so the full review-and-confirm flow can
  be exercised end-to-end.

Reset demo data any time from **Profile → Reset demo data**.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll land on onboarding, then the AI chat.

## Connecting real services (optional)

Copy the template and fill in only what you're ready to use:

```bash
cp .env.example .env.local
```

### Supabase

1. Create a project at supabase.com.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
   Project Settings → API.
3. Run the migration:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   (or paste `supabase/migrations/0001_init.sql` into the SQL editor).
4. Seed the exercise library: run `supabase/seed/seed_exercises.sql` the
   same way.
5. For the media-cleanup cron, set `SUPABASE_SERVICE_ROLE_KEY` (server-side
   only — never expose to the client) and create two Storage buckets:
   `food-images` and `fitness-screenshots`, both private.

The app's data layer is not yet wired to Supabase — the schema and RLS
policies are complete and ready, but reads/writes currently go through the
demo store described above. Wiring `src/lib/demo/store.tsx` to Supabase
client calls is the next integration step once you're moving off demo mode.

### AI provider

Set `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY=...` to use a real model
instead of the mock provider. Optionally set `ANTHROPIC_MODEL` (defaults to
a current Claude model — check docs.claude.com for the latest name). The
provider abstraction (`src/lib/ai/types.ts`) makes it straightforward to add
OpenAI/Gemini adapters behind the same interface later.

### Media retention cleanup

Uploaded food images and fitness screenshots are meant to be retained for a
maximum of **24 hours**. `GET /api/cron/cleanup-media` deletes expired rows
and their Storage objects once Supabase is configured; it's a no-op in demo
mode. Schedule it with **Vercel Cron** (`vercel.json` already points at it
once daily, at 03:00 UTC — Vercel Hobby plan only supports daily cron
frequency) — set `CRON_SECRET` in your Vercel project and Vercel will send the
matching `Authorization: Bearer` header automatically. Alternatively, call
the same logic from a Supabase scheduled Edge Function.

## Project structure

```
src/
  app/            routes (App Router) — onboarding, (app) group (AI/Today/History/Profile), workout/[id], api/*
  components/     ui primitives + chat structured-card components
  features/       reserved for feature-specific composition (currently colocated under app/)
  lib/
    ai/           AIProvider interface + mock & Anthropic adapters + factory
    demo/         demo data store, seed data, workout/plan generators
    nutrition/    seeded Indian food reference data, calorie/protein target estimator
    utils.ts
  server/
    ai/           orchestration (intent routing, system prompt) + safety layer
  types/          shared domain types (mirrors the Postgres schema)
supabase/
  migrations/     0001_init.sql — full schema + RLS
  seed/           seed_exercises.sql — exercise library reference data
```

## Deployment (Vercel)

```bash
npm run build
```

Deploys cleanly to Vercel with no required environment variables (runs in
demo mode). Add the Supabase/Anthropic variables above when ready to go
beyond demo mode.

## Known MVP limitations

- **Demo-mode data layer**: state lives in `localStorage`, not Postgres. The
  Supabase schema/RLS is complete but not yet wired to the app's read/write
  paths — see "Connecting real services" above.
- **No real authentication flow yet**: Supabase Auth is not wired into the
  UI (login/signup screens aren't built); the app currently operates as a
  single demo user. Auth architecture (RLS, `user_id` ownership on every
  table) is in place and ready for this to be added.
- **Mock vision analysis**: without `AI_PROVIDER=anthropic`, food/screenshot
  "detection" is a rotating set of plausible demo results, not real
  computer vision.
- **Exercise reference imagery**: the active workout screen shows a
  placeholder reference panel per exercise; the data model
  (`image_ref`/`video_ref`) is ready for real photography/video later.
- **Nutrition data is a small seeded reference set**, not a full food
  database — sufficient for demo purposes and common Indian dishes.
- **No payments, subscriptions, or usage limits enforced** — usage is
  tracked (`usage_events`) but not gated, per MVP scope.
