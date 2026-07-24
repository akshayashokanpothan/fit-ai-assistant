"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDemoStore } from "@/lib/demo/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/avatar";
import { resizeImageToDataUrl } from "@/lib/image-utils";
import { cn } from "@/lib/utils";
import type {
  DietPreference,
  ExperienceLevel,
  Goal,
  TrainingEnvironment,
  TrainingFrequency,
} from "@/types";
import { Check, RotateCcw, ShieldCheck } from "lucide-react";

const GOALS: { value: Goal; label: string }[] = [
  { value: "lose_weight", label: "Lose weight" },
  { value: "gain_muscle", label: "Gain muscle" },
  { value: "maintain", label: "Maintain weight" },
  { value: "general_fitness", label: "General fitness" },
];
const EXPERIENCE: { value: ExperienceLevel; label: string }[] = [
  { value: "new", label: "New" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];
const ENVIRONMENTS: { value: TrainingEnvironment; label: string }[] = [
  { value: "gym", label: "Gym" },
  { value: "home", label: "Home" },
  { value: "both", label: "Both" },
];
const DIETS: { value: DietPreference; label: string }[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "non_vegetarian", label: "Non-veg" },
  { value: "eggetarian", label: "Eggetarian" },
  { value: "vegan", label: "Vegan" },
];
const FREQUENCIES: TrainingFrequency[] = [2, 3, 4, 5, 6];

export default function ProfilePage() {
  const router = useRouter();
  const { state, updateProfile, addBodyMetric, resetDemo } = useDemoStore();
  const p = state.profile;

  const [form, setForm] = useState({
    displayName: p.displayName ?? "",
    goal: p.goal,
    age: p.age?.toString() ?? "",
    heightCm: p.heightCm?.toString() ?? "",
    weightKg: p.weightKg?.toString() ?? "",
    experience: p.experience,
    environment: p.environment,
    frequencyPerWeek: p.frequencyPerWeek,
    dietPreference: p.dietPreference,
    limitations: p.limitations ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  async function onAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarError(null);
    setAvatarBusy(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      updateProfile({ avatarUrl: dataUrl });
    } catch {
      setAvatarError("Couldn't use that photo — try a different image.");
    } finally {
      setAvatarBusy(false);
    }
  }

  function removeAvatar() {
    updateProfile({ avatarUrl: null });
  }

  function save() {
    const newWeight = Number(form.weightKg) || p.weightKg;
    updateProfile({
      displayName: form.displayName,
      goal: form.goal,
      age: Number(form.age) || p.age,
      heightCm: Number(form.heightCm) || p.heightCm,
      weightKg: newWeight,
      experience: form.experience,
      environment: form.environment,
      frequencyPerWeek: form.frequencyPerWeek,
      dietPreference: form.dietPreference,
      limitations: form.limitations.trim() || null,
    });
    if (newWeight && newWeight !== p.weightKg) {
      addBodyMetric(newWeight);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="px-5 pt-6 pb-8">
      <h1 className="font-display text-[26px] font-medium text-ink">Profile</h1>
      <p className="mt-1 text-sm text-ink-soft">
        This is what I use to personalise everything — keep it up to date.
      </p>

      <div className="mt-6 flex items-center gap-4">
        <Avatar src={p.avatarUrl} size={64} />
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={avatarBusy}
              onClick={() => avatarInputRef.current?.click()}
            >
              {avatarBusy ? "Uploading…" : "Change photo"}
            </Button>
            {p.avatarUrl && (
              <Button variant="ghost" size="sm" onClick={removeAvatar}>
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-muted">Optional — used only in the top bar and here.</p>
          {avatarError && <p className="text-xs text-danger">{avatarError}</p>}
        </div>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onAvatarSelected}
        />
      </div>

      <Section title="About you">
        <Field label="Name">
          <Input
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age">
            <Input
              inputMode="numeric"
              value={form.age}
              onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
            />
          </Field>
          <Field label="Weight (kg)">
            <Input
              inputMode="decimal"
              value={form.weightKg}
              onChange={(e) => setForm((f) => ({ ...f, weightKg: e.target.value }))}
            />
          </Field>
          <Field label="Height (cm)">
            <Input
              inputMode="numeric"
              value={form.heightCm}
              onChange={(e) => setForm((f) => ({ ...f, heightCm: e.target.value }))}
            />
          </Field>
        </div>
      </Section>

      <Section title="Goal">
        <Chips
          options={GOALS}
          value={form.goal}
          onChange={(v) => setForm((f) => ({ ...f, goal: v }))}
        />
      </Section>

      <Section title="Experience">
        <Chips
          options={EXPERIENCE}
          value={form.experience}
          onChange={(v) => setForm((f) => ({ ...f, experience: v }))}
        />
      </Section>

      <Section title="Training environment">
        <Chips
          options={ENVIRONMENTS}
          value={form.environment}
          onChange={(v) => setForm((f) => ({ ...f, environment: v }))}
        />
      </Section>

      <Section title="Training frequency">
        <div className="flex flex-wrap gap-2">
          {FREQUENCIES.map((f) => (
            <button
              key={f}
              onClick={() => setForm((s) => ({ ...s, frequencyPerWeek: f }))}
              className={cn(
                "h-10 w-14 rounded-[var(--radius-sm)] border text-sm font-medium tabular",
                form.frequencyPerWeek === f
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-line-strong text-ink-soft"
              )}
            >
              {f}d
            </button>
          ))}
        </div>
      </Section>

      <Section title="Dietary preference">
        <Chips
          options={DIETS}
          value={form.dietPreference}
          onChange={(v) => setForm((f) => ({ ...f, dietPreference: v }))}
        />
      </Section>

      <Section title="Limitations" subtitle="Optional — injuries or things to avoid">
        <Textarea
          rows={3}
          value={form.limitations}
          onChange={(e) => setForm((f) => ({ ...f, limitations: e.target.value }))}
        />
      </Section>

      <Button className="mt-6 w-full" onClick={save}>
        {saved ? (
          <>
            <Check className="h-4 w-4" /> Saved
          </>
        ) : (
          "Save changes"
        )}
      </Button>

      <Section title="Privacy & data">
        <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-primary-soft p-3 text-xs text-primary">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            This pilot runs in demo mode — your data stays in this browser only and is never
            shared. Food and activity photos are never kept longer than 24 hours.
          </span>
        </div>
        {!confirmReset ? (
          <Button
            variant="outline"
            className="mt-3 w-full"
            onClick={() => setConfirmReset(true)}
          >
            <RotateCcw className="h-4 w-4" /> Reset demo data
          </Button>
        ) : (
          <div className="mt-3 rounded-[var(--radius-md)] border border-danger-soft bg-danger-soft p-3">
            <p className="text-xs text-ink">
              This clears all logged meals, workouts, activity, and conversation history on this
              device. This can&apos;t be undone.
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                variant="danger"
                size="sm"
                className="flex-1"
                onClick={() => {
                  resetDemo();
                  router.replace("/onboarding");
                }}
              >
                Confirm reset
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => setConfirmReset(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Section>

      <Section title="Account">
        <p className="text-sm text-ink-soft">
          Signed in as <span className="font-medium text-ink">demo account</span>. Real
          authentication connects here once Supabase is configured.
        </p>
      </Section>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-8">
      <h2 className="text-sm font-medium text-ink-soft">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </div>
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

function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full border px-3.5 py-2 text-[13px]",
            value === o.value
              ? "border-primary bg-primary-soft text-primary"
              : "border-line-strong text-ink-soft"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
