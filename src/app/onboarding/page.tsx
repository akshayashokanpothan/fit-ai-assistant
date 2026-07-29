"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDemoStore } from "@/lib/demo/store";
import { useAuth } from "@/lib/auth/auth-context";
import { useProfileDAL } from "@/lib/data/profile";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/avatar";
import { ProfileImageCropper } from "@/components/profile-image-cropper";
import { cn } from "@/lib/utils";
import type {
  DietPreference,
  ExperienceLevel,
  Goal,
  TrainingEnvironment,
  TrainingFrequency,
} from "@/types";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

type StepId =
  | "welcome"
  | "photo"
  | "goal"
  | "body"
  | "experience"
  | "environment"
  | "frequency"
  | "diet"
  | "limitations"
  | "confirm";

const STEPS: StepId[] = [
  "welcome",
  "photo",
  "goal",
  "body",
  "experience",
  "environment",
  "frequency",
  "diet",
  "limitations",
  "confirm",
];

const GOALS: { value: Goal; label: string; hint: string }[] = [
  { value: "lose_weight", label: "Lose weight", hint: "Steady, sustainable fat loss" },
  { value: "gain_muscle", label: "Gain muscle", hint: "Build strength and size" },
  { value: "maintain", label: "Maintain weight", hint: "Stay consistent where I am" },
  { value: "general_fitness", label: "Improve general fitness", hint: "Feel stronger, more active" },
];

const EXPERIENCE: { value: ExperienceLevel; label: string }[] = [
  { value: "new", label: "New to training" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const ENVIRONMENTS: { value: TrainingEnvironment; label: string }[] = [
  { value: "gym", label: "Gym" },
  { value: "home", label: "Home" },
  { value: "both", label: "Both" },
];

const FREQUENCIES: TrainingFrequency[] = [2, 3, 4, 5, 6];

const DIETS: { value: DietPreference; label: string }[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "non_vegetarian", label: "Non-vegetarian" },
  { value: "eggetarian", label: "Eggetarian" },
  { value: "vegan", label: "Vegan" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, completeOnboarding } = useProfileDAL();
  // Avatar has no column in public.profiles yet (Storage is a future
  // phase), so it's the one field that still goes through the demo store —
  // see the comment near the submit handler below.
  const { updateProfile: updateDemoProfile } = useDemoStore();

  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarType, setAvatarType] = useState<"photo" | "avatar">("photo");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "other" | null>(null);
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [environment, setEnvironment] = useState<TrainingEnvironment | null>(null);
  const [frequency, setFrequency] = useState<TrainingFrequency | null>(null);
  const [diet, setDiet] = useState<DietPreference | null>(null);
  const [limitations, setLimitations] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Onboarding requires a signed-in user to persist anything
  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (profile?.onboardingCompletedAt) {
      router.replace("/today");
    }
  }, [authLoading, profileLoading, user, profile, router]);

  async function onAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    
    setAvatarBusy(true);
    try {
      // Create object URL for the cropper
      const src = URL.createObjectURL(file);
      setRawImageSrc(src);
    } catch {
      // silently ignore and let the user continue without a photo
    } finally {
      setAvatarBusy(false);
    }
  }

  function handleCropComplete(croppedImageBase64: string) {
    setAvatarUrl(croppedImageBase64);
    setAvatarType("photo");
    setRawImageSrc(null);
  }

  const canAdvance: Record<StepId, boolean> = {
    welcome: displayName.trim().length > 0,
    photo: true, // Always true so they can skip
    goal: !!goal,
    body: !!age && !!heightCm && !!weightKg && !!sex,
    experience: !!experience,
    environment: !!environment,
    frequency: !!frequency,
    diet: !!diet,
    limitations: true,
    confirm: true,
  };

  function next() {
    if (step === "confirm") {
      submit();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  async function submit() {
    setSubmitError(null);
    setSubmitting(true);
    const { error } = await completeOnboarding({
      displayName,
      goal,
      age: Number(age),
      sex,
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      experience,
      environment,
      frequencyPerWeek: frequency,
      dietPreference: diet,
      limitations: limitations.trim() || null,
    });
    
    if (error) {
      setSubmitError(error);
      setSubmitting(false);
      return;
    }

    let finalAvatarUrl = avatarUrl;
    let finalAvatarType = avatarType;

    if (!finalAvatarUrl) {
      const bg = "#F0FDF4"; 
      const fg = "#16A34A";
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${bg}"/><circle cx="50" cy="40" r="20" fill="${fg}"/><path d="M20 100 Q 50 60 80 100" fill="${fg}"/></svg>`;
      finalAvatarUrl = `data:image/svg+xml;base64,${btoa(svg)}`;
      finalAvatarType = "avatar";
    }

    if (finalAvatarUrl) {
      updateDemoProfile({ avatarUrl: finalAvatarUrl });
    }

    router.replace("/today");
  }

  function back() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  const progressPct = ((stepIndex + 1) / STEPS.length) * 100;

  if (authLoading || profileLoading || !user || profile?.onboardingCompletedAt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line-strong border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-8 pt-6">
      {step !== "welcome" && (
        <div className="mb-8 flex items-center gap-3">
          <button
            onClick={back}
            aria-label="Go back"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-black/[0.04]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Progress value={progressPct} className="flex-1" />
        </div>
      )}

      <div className="flex-1">
        {step === "welcome" && (
          <div className="pt-10">
            <p className="font-display text-sm italic text-primary">Namaste 🙏</p>
            <h1 className="mt-2 font-display text-[32px] font-medium leading-[1.15] text-ink">
              Let&apos;s set up your everyday fitness companion.
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
              A few quick questions so I can understand your goals, your schedule, and how to
              actually help — no medical forms, just the basics.
            </p>
            <label className="mt-8 block text-sm font-medium text-ink-soft">
              What should I call you?
            </label>
            <Input
              className="mt-2"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {step === "photo" && (
          <StepShell
            title="Add your profile photo"
            subtitle="Personalize your Pace AI experience. Your profile image will sync across devices."
          >
            <div className="flex flex-col items-center gap-4 pt-2">
              <Avatar src={avatarUrl} size={96} />
              <div className="flex flex-col items-center gap-3 w-full max-w-xs mt-2">
                <Button
                  className="w-full"
                  disabled={avatarBusy}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {avatarBusy ? "Uploading…" : avatarUrl ? "Change photo" : "Choose Photo"}
                </Button>
                <Button variant="ghost" className="w-full text-muted hover:text-ink" onClick={next}>
                  Skip for now
                </Button>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onAvatarSelected}
              />
            </div>
          </StepShell>
        )}

        {rawImageSrc && (
          <ProfileImageCropper
            imageSrc={rawImageSrc}
            onCropComplete={handleCropComplete}
            onCancel={() => setRawImageSrc(null)}
          />
        )}

        {step === "goal" && (
          <StepShell title="What's your main goal right now?">
            <div className="grid gap-3">
              {GOALS.map((g) => (
                <OptionCard
                  key={g.value}
                  selected={goal === g.value}
                  label={g.label}
                  hint={g.hint}
                  onClick={() => setGoal(g.value)}
                />
              ))}
            </div>
          </StepShell>
        )}

        {step === "body" && (
          <StepShell title="A little about your body">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Age">
                <Input inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} placeholder="28" />
              </Field>
              <Field label="Sex">
                <div className="flex gap-2">
                  {(["male", "female", "other"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSex(s)}
                      className={cn(
                        "h-11 flex-1 rounded-[var(--radius-sm)] border text-sm capitalize",
                        sex === s
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-line-strong text-ink-soft"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Height (cm)">
                <Input inputMode="numeric" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="172" />
              </Field>
              <Field label="Weight (kg)">
                <Input inputMode="numeric" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="70" />
              </Field>
            </div>
          </StepShell>
        )}

        {step === "experience" && (
          <StepShell title="How experienced are you with training?">
            <div className="grid gap-3">
              {EXPERIENCE.map((e) => (
                <OptionCard
                  key={e.value}
                  selected={experience === e.value}
                  label={e.label}
                  onClick={() => setExperience(e.value)}
                />
              ))}
            </div>
          </StepShell>
        )}

        {step === "environment" && (
          <StepShell title="Where do you usually train?">
            <div className="grid grid-cols-3 gap-3">
              {ENVIRONMENTS.map((e) => (
                <OptionCard
                  key={e.value}
                  compact
                  selected={environment === e.value}
                  label={e.label}
                  onClick={() => setEnvironment(e.value)}
                />
              ))}
            </div>
          </StepShell>
        )}

        {step === "frequency" && (
          <StepShell title="How many days a week can you train?">
            <div className="grid grid-cols-5 gap-2">
              {FREQUENCIES.map((f) => (
                <button
                  key={f}
                  onClick={() => setFrequency(f)}
                  className={cn(
                    "flex h-14 flex-col items-center justify-center rounded-[var(--radius-sm)] border text-sm font-medium",
                    frequency === f
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-line-strong text-ink-soft"
                  )}
                >
                  <span className="tabular text-base">{f}</span>
                  <span className="text-[11px] text-muted">days</span>
                </button>
              ))}
            </div>
          </StepShell>
        )}

        {step === "diet" && (
          <StepShell title="What best describes your diet?">
            <div className="grid gap-3">
              {DIETS.map((d) => (
                <OptionCard
                  key={d.value}
                  selected={diet === d.value}
                  label={d.label}
                  onClick={() => setDiet(d.value)}
                />
              ))}
            </div>
          </StepShell>
        )}

        {step === "limitations" && (
          <StepShell
            title="Anything I should keep in mind?"
            subtitle="Optional — injuries, discomfort, or things to avoid. No need to overthink this."
          >
            <Textarea
              rows={4}
              placeholder="e.g. mild knee discomfort with squats"
              value={limitations}
              onChange={(e) => setLimitations(e.target.value)}
            />
          </StepShell>
        )}

        {step === "confirm" && (
          <StepShell title="Here's what I've got">
            <div className="space-y-3">
              <SummaryRow label="Name" value={displayName} />
              <SummaryRow label="Goal" value={GOALS.find((g) => g.value === goal)?.label ?? ""} />
              <SummaryRow label="Body" value={`${age} yrs · ${heightCm}cm · ${weightKg}kg`} />
              <SummaryRow
                label="Experience"
                value={EXPERIENCE.find((e) => e.value === experience)?.label ?? ""}
              />
              <SummaryRow
                label="Trains"
                value={`${ENVIRONMENTS.find((e) => e.value === environment)?.label ?? ""} · ${frequency} days/week`}
              />
              <SummaryRow label="Diet" value={DIETS.find((d) => d.value === diet)?.label ?? ""} />
              {limitations && <SummaryRow label="Notes" value={limitations} />}
            </div>
          </StepShell>
        )}
      </div>

      {step === "confirm" && submitError && (
        <p className="mt-4 text-center text-sm text-danger">{submitError}</p>
      )}

      <Button
        size="lg"
        className="mt-8 w-full"
        disabled={!canAdvance[step] || submitting}
        onClick={next}
      >
        {step === "confirm" ? (
          submitting ? (
            "Saving…"
          ) : (
            <>
              Start using Pace AI <Check className="h-4 w-4" />
            </>
          )
        ) : (
          <>
            Continue <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pt-4">
      <h2 className="font-display text-2xl font-medium leading-tight text-ink">{title}</h2>
      {subtitle && <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function OptionCard({
  label,
  hint,
  selected,
  onClick,
  compact,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-between rounded-[var(--radius-md)] border px-4 text-left transition-colors",
        compact ? "h-14 flex-col items-center justify-center gap-0 text-center" : "h-16",
        selected ? "border-primary bg-primary-soft" : "border-line-strong bg-surface"
      )}
    >
      <div>
        <div className={cn("text-[15px] font-medium", selected ? "text-primary" : "text-ink")}>
          {label}
        </div>
        {hint && !compact && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
      </div>
      {selected && !compact && <Check className="h-4 w-4 shrink-0 text-primary" />}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-right text-[15px] text-ink">{value}</span>
    </div>
  );
}
