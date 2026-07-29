"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useProfileDAL } from "@/lib/data/profile";
import { useBodyMetricsDAL } from "@/lib/data/body-metrics";
import { useDemoStore } from "@/lib/demo/store";
import { Button } from "@/components/ui/button";
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
import { 
  Check, 
  RotateCcw, 
  ShieldCheck, 
  ChevronRight, 
  Download, 
  LogOut,
  Scale, 
  Dumbbell, 
  Minus, 
  Activity,
  Crown,
  Bell,
  Stethoscope,
  HeartPulse,
  Info,
  HelpCircle,
  UserCircle2,
  Utensils
} from "lucide-react";

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
  const { user, signOut } = useAuth();
  
  const { profile, updateProfile: saveProfile } = useProfileDAL();
  const { addBodyMetric } = useBodyMetricsDAL();
  const { state, updateProfile: updateDemoProfile, resetDemo } = useDemoStore();

  const [form, setForm] = useState({
    displayName: profile?.displayName ?? "",
    goal: profile?.goal ?? null,
    age: profile?.age?.toString() ?? "",
    heightCm: profile?.heightCm?.toString() ?? "",
    weightKg: profile?.weightKg?.toString() ?? "",
    experience: profile?.experience ?? null,
    environment: profile?.environment ?? null,
    frequencyPerWeek: profile?.frequencyPerWeek ?? null,
    dietPreference: profile?.dietPreference ?? null,
    limitations: profile?.limitations ?? "",
  });

  useEffect(() => {
    if (!profile) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      displayName: profile.displayName ?? "",
      goal: profile.goal,
      age: profile.age?.toString() ?? "",
      heightCm: profile.heightCm?.toString() ?? "",
      weightKg: profile.weightKg?.toString() ?? "",
      experience: profile.experience,
      environment: profile.environment,
      frequencyPerWeek: profile.frequencyPerWeek,
      dietPreference: profile.dietPreference,
      limitations: profile.limitations ?? "",
    });
  }, [profile]);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  async function onAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarError(null);
    setAvatarBusy(true);
    try {
      const src = URL.createObjectURL(file);
      setRawImageSrc(src);
    } catch {
      setAvatarError("Couldn't use that photo — try a different image.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleCropComplete(croppedImageBase64: string) {
    setRawImageSrc(null);
    setAvatarBusy(true);
    try {
      updateDemoProfile({ avatarUrl: croppedImageBase64 });
    } catch {
      setAvatarError("Failed to save avatar.");
    } finally {
      setAvatarBusy(false);
    }
  }

  function removeAvatar() {
    updateDemoProfile({ avatarUrl: null });
  }

  async function save() {
    if (!profile) return;
    setSaveError(null);
    setSaving(true);
    const newWeight = Number(form.weightKg) || profile.weightKg;
    const { error } = await saveProfile({
      displayName: form.displayName,
      goal: form.goal,
      age: Number(form.age) || profile.age,
      heightCm: Number(form.heightCm) || profile.heightCm,
      weightKg: newWeight,
      experience: form.experience,
      environment: form.environment,
      frequencyPerWeek: form.frequencyPerWeek,
      dietPreference: form.dietPreference,
      limitations: form.limitations.trim() || null,
    });
    setSaving(false);
    if (error) {
      setSaveError(error);
      return;
    }
    if (newWeight && newWeight !== profile.weightKg) {
      addBodyMetric(newWeight);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogout() {
    await signOut();
    resetDemo(); // Clear local demo session just in case
    router.replace("/login");
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line-strong border-t-primary" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-28 relative">
      <div className="mb-8">
        <h1 className="font-display text-[28px] font-bold text-ink tracking-tight">Profile</h1>
        <p className="mt-1 text-[13px] text-ink-soft max-w-[280px]">
          Personalise your experience — so your AI coach understands you better.
        </p>
      </div>

      {/* Identity Card */}
      <div className="mb-6 rounded-[20px] bg-surface p-5 border border-line flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar src={state.profile.avatarUrl} size={64} className="border-2 border-paper shadow-sm" />
          <div className="flex flex-col">
            <span className="font-bold text-ink text-[17px]">{form.displayName || user?.email?.split('@')[0] || "User"}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[12px] text-ink-soft font-medium">Active</span>
            </div>
            <span className="text-[12px] text-ink-soft/70 mt-0.5">{user?.email}</span>
            {avatarError && <span className="text-[10px] text-danger mt-1">{avatarError}</span>}
          </div>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button 
            className="text-[12px] font-medium text-ink bg-paper px-3 py-1.5 rounded-full border border-line hover:bg-line-soft transition-colors"
            disabled={avatarBusy}
            onClick={() => avatarInputRef.current?.click()}
          >
            {avatarBusy ? "..." : "Change photo"}
          </button>
          {state.profile.avatarUrl && (
            <button 
              className="text-[12px] font-medium text-ink-soft hover:text-danger transition-colors text-center"
              onClick={removeAvatar}
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onAvatarSelected}
        />
      </div>

      {rawImageSrc && (
        <ProfileImageCropper
          imageSrc={rawImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={() => setRawImageSrc(null)}
        />
      )}

      {/* Journey Summary */}
      <div className="mb-8 rounded-[20px] bg-primary-soft p-5 border border-primary/10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[13px] font-bold text-ink">Your journey</h3>
          <span className="text-[11px] text-ink-soft">Updated today</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
           <div className="flex flex-col gap-1 items-center text-center">
             <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary mb-1 shadow-sm">
                <Scale className="w-4 h-4" />
             </div>
             <span className="font-bold text-ink text-[15px]">{form.weightKg || "--"} kg</span>
             <span className="text-[11px] text-ink-soft">Current weight</span>
           </div>
           
           <div className="flex flex-col gap-1 items-center text-center">
             <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-orange-500 mb-1 shadow-sm">
                <Activity className="w-4 h-4" />
             </div>
             <span className="font-bold text-ink text-[15px]">
               {state.activities.length > 0 ? `${state.activities.length} total` : "--"}
             </span>
             <span className="text-[11px] text-ink-soft">Activities logged</span>
           </div>

           <div className="flex flex-col gap-1 items-center text-center">
             <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary mb-1 shadow-sm">
                <Dumbbell className="w-4 h-4" />
             </div>
             <span className="font-bold text-ink text-[15px]">{form.frequencyPerWeek || "--"}d / wk</span>
             <span className="text-[11px] text-ink-soft">Training</span>
           </div>
        </div>
      </div>

      <Section title="Personal details" icon={<UserCircle2 className="w-4 h-4" />}>
        <div className="rounded-[16px] bg-surface border border-line p-1">
          <div className="p-3 border-b border-line">
            <span className="block text-[11px] text-ink-soft mb-1 font-medium">Name</span>
            <input 
              className="w-full bg-transparent text-[15px] text-ink font-medium focus:outline-none" 
              value={form.displayName}
              placeholder="Your name"
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 p-3 border-b border-line gap-4">
             <div>
               <span className="block text-[11px] text-ink-soft mb-1 font-medium">Age</span>
               <input 
                 className="w-full bg-transparent text-[15px] text-ink font-medium focus:outline-none" 
                 inputMode="numeric"
                 value={form.age}
                 placeholder="--"
                 onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
               />
             </div>
             <div>
               <span className="block text-[11px] text-ink-soft mb-1 font-medium">Height</span>
               <div className="flex items-center">
                 <input 
                   className="w-full bg-transparent text-[15px] text-ink font-medium focus:outline-none" 
                   inputMode="numeric"
                   value={form.heightCm}
                   placeholder="--"
                   onChange={(e) => setForm((f) => ({ ...f, heightCm: e.target.value }))}
                 />
                 <span className="text-[13px] text-ink-soft ml-1">cm</span>
               </div>
             </div>
          </div>
          <div className="p-3">
             <span className="block text-[11px] text-ink-soft mb-1 font-medium">Current weight</span>
             <div className="flex items-center">
                 <input 
                   className="w-full bg-transparent text-[15px] text-ink font-medium focus:outline-none" 
                   inputMode="decimal"
                   value={form.weightKg}
                   placeholder="--"
                   onChange={(e) => setForm((f) => ({ ...f, weightKg: e.target.value }))}
                 />
                 <span className="text-[13px] text-ink-soft ml-1">kg</span>
             </div>
          </div>
        </div>
      </Section>

      <Section title="Your goal" subtitle="What do you want to achieve?" icon={<Crown className="w-4 h-4" />}>
        <div className="grid grid-cols-2 gap-3">
          {GOALS.map(g => (
            <button
               key={g.value}
               onClick={() => setForm(f => ({ ...f, goal: g.value as Goal }))}
               className={cn(
                 "flex items-center gap-2.5 px-4 py-3.5 rounded-[12px] border text-left transition-colors",
                 form.goal === g.value
                    ? "border-primary bg-primary-soft text-primary font-medium"
                    : "border-line bg-surface text-ink hover:border-primary/30"
               )}
            >
               <div className={cn(form.goal === g.value ? "text-primary" : "text-ink-soft")}>
                 {g.value === 'lose_weight' && <Scale className="w-4 h-4" />}
                 {g.value === 'gain_muscle' && <Dumbbell className="w-4 h-4" />}
                 {g.value === 'maintain' && <Minus className="w-4 h-4" />}
                 {g.value === 'general_fitness' && <Activity className="w-4 h-4" />}
               </div>
               <span className="text-[13px]">{g.label}</span>
            </button>
          ))}
        </div>
      </Section>

      <div className="grid grid-cols-2 gap-6 mt-8">
        <div>
           <div className="flex items-center gap-2 mb-3">
             <Dumbbell className="w-4 h-4 text-ink-soft" />
             <h2 className="text-[14px] font-bold text-ink">Experience</h2>
           </div>
           <Chips options={EXPERIENCE} value={form.experience} onChange={(v) => setForm((f) => ({ ...f, experience: v }))} vertical />
        </div>
        <div>
           <div className="flex items-center gap-2 mb-3">
             <Activity className="w-4 h-4 text-ink-soft" />
             <h2 className="text-[14px] font-bold text-ink">Training environment</h2>
           </div>
           <Chips options={ENVIRONMENTS} value={form.environment} onChange={(v) => setForm((f) => ({ ...f, environment: v }))} vertical />
        </div>
      </div>

      <div className="mt-8">
         <div className="flex items-center gap-2 mb-3">
           <Activity className="w-4 h-4 text-ink-soft" />
           <h2 className="text-[14px] font-bold text-ink">Training frequency</h2>
         </div>
         <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {FREQUENCIES.map((f) => (
            <button
              key={f}
              onClick={() => setForm((s) => ({ ...s, frequencyPerWeek: f }))}
              className={cn(
                "h-[42px] min-w-[52px] rounded-[10px] border text-[14px] font-medium transition-colors shrink-0",
                form.frequencyPerWeek === f
                  ? "border-[#114220] bg-[#114220] text-white"
                  : "border-line bg-surface text-ink hover:border-line-strong"
              )}
            >
              {f}d
            </button>
          ))}
         </div>
      </div>

      <Section title="Dietary preference" subtitle="Helps Pace AI suggest meals that work for you." icon={<Utensils className="w-4 h-4" />}>
        <Chips options={DIETS} value={form.dietPreference} onChange={(v) => setForm((f) => ({ ...f, dietPreference: v }))} />
      </Section>

      <Section title="Health conditions / Limitations" icon={<Stethoscope className="w-4 h-4" />}>
        <p className="text-[12px] text-ink-soft mb-2">Add any allergies, injuries or things to avoid. <span className="bg-line-strong px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider text-ink-soft ml-1">Optional</span></p>
        <Textarea
          rows={3}
          value={form.limitations}
          placeholder="e.g. Lactose intolerance, knee pain, no spicy food, etc."
          onChange={(e) => setForm((f) => ({ ...f, limitations: e.target.value }))}
          className="rounded-[16px] bg-surface"
        />
        <div className="mt-4 p-4 rounded-[16px] bg-primary-soft/50 border border-primary/10">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="text-[13px] font-bold text-primary mb-1">Why we ask this?</h4>
              <p className="text-[12px] text-primary/80">These details help Pace AI give you safer, smarter and more personalised diet and workout suggestions.</p>
            </div>
          </div>
        </div>
      </Section>

      <div className="mt-12 space-y-6">
         <div>
           <h2 className="text-[14px] font-bold text-ink mb-3 px-1">Account & Plan</h2>
           <div className="rounded-[20px] border border-line overflow-hidden">
             <ActionRow icon={<Crown className="w-5 h-5" />} title="Usage & plan" description="Free plan • Upgrade anytime" />
           </div>
         </div>

         <div>
           <h2 className="text-[14px] font-bold text-ink mb-3 px-1">Privacy & Data</h2>
           <div className="rounded-[20px] border border-line overflow-hidden">
             <ActionRow icon={<ShieldCheck className="w-5 h-5" />} title="Privacy & data" description="View how your data is used" />
           </div>
         </div>

         <div>
           <h2 className="text-[14px] font-bold text-ink mb-3 px-1">Preferences</h2>
           <div className="rounded-[20px] border border-line overflow-hidden">
             <ActionRow icon={<Bell className="w-5 h-5" />} title="Notifications" description="Manage alerts & reminders" />
           </div>
         </div>

         <div>
           <h2 className="text-[14px] font-bold text-ink mb-3 px-1">Healthcare Connections</h2>
           <div className="rounded-[20px] border border-line overflow-hidden">
             <ActionRow icon={<Stethoscope className="w-5 h-5" />} title="Connect Physician" badge="Coming Soon" />
             <ActionRow icon={<HeartPulse className="w-5 h-5" />} title="Connect Dietician" badge="Coming Soon" />
           </div>
         </div>

         <div>
           <h2 className="text-[14px] font-bold text-ink mb-3 px-1">Support</h2>
           <div className="rounded-[20px] border border-line overflow-hidden">
             <ActionRow icon={<HelpCircle className="w-5 h-5" />} title="Pace Support" description="Help centre & contact" />
           </div>
         </div>

         <div>
           <h2 className="text-[14px] font-bold text-ink mb-3 px-1">Data Management</h2>
           <div className="rounded-[20px] border border-line overflow-hidden">
             <ActionRow icon={<Download className="w-5 h-5" />} title="Export my data" description="Download your health data" />
             <ActionRow icon={<RotateCcw className="w-5 h-5" />} title="Reset demo data" description="Clear all saved information (Demo only)" onClick={() => setConfirmReset(true)} />
           </div>
           
           {confirmReset && (
              <div className="mt-3 p-4 bg-danger-soft border border-danger/20 rounded-[20px]">
                 <p className="text-[12px] text-ink mb-3">This clears all local demo data. Cannot be undone.</p>
                 <div className="flex gap-2">
                   <Button variant="danger" size="sm" className="flex-1" onClick={() => { resetDemo(); router.replace("/today"); }}>Confirm reset</Button>
                   <Button variant="ghost" size="sm" className="flex-1" onClick={() => setConfirmReset(false)}>Cancel</Button>
                 </div>
              </div>
           )}
         </div>

         <div>
           <div className="rounded-[20px] border border-danger/20 overflow-hidden bg-danger/5">
             <ActionRow icon={<LogOut className="w-5 h-5" />} title="Logout" description="Sign out of your account" danger onClick={handleLogout} />
           </div>
         </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-paper via-paper to-transparent px-5 pb-6 pt-12 md:max-w-[440px] md:mx-auto md:left-auto md:right-auto md:w-full">
        <Button 
          className="w-full rounded-[16px] h-[52px] bg-[#114220] hover:bg-[#0c3117] text-white font-medium text-[15px] shadow-lg shadow-[#114220]/20" 
          onClick={save} 
          disabled={saving}
        >
          {saving ? (
            "Saving…"
          ) : saved ? (
            <>
              <Check className="h-5 w-5 mr-2" /> All changes saved
            </>
          ) : (
            "Save changes"
          )}
        </Button>
        {saveError && <p className="mt-2 text-center text-sm text-danger">{saveError}</p>}
      </div>

    </div>
  );
}

function Section({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-3">
        {icon && <div className="text-ink-soft">{icon}</div>}
        <h2 className="text-[15px] font-bold text-ink">{title}</h2>
      </div>
      {subtitle && <p className="mb-3 text-[13px] text-ink-soft">{subtitle}</p>}
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ActionRow({ icon, title, description, badge, onClick, danger }: { icon: React.ReactNode, title: string, description?: string, badge?: string, onClick?: () => void, danger?: boolean }) {
  return (
    <button onClick={onClick} disabled={!onClick} className="w-full flex items-center justify-between p-4 bg-surface border-b border-line last:border-0 hover:bg-line-soft transition-colors text-left disabled:opacity-80 disabled:cursor-default group">
      <div className="flex items-center gap-4">
        <div className={cn("text-ink-soft shrink-0", danger && "text-danger")}>{icon}</div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className={cn("text-[14px] font-bold text-ink", danger && "text-danger")}>{title}</span>
            {badge && <span className="text-[10px] uppercase font-bold tracking-wider bg-line-strong px-1.5 py-0.5 rounded text-ink-soft">{badge}</span>}
          </div>
          {description && <span className="text-[12px] text-ink-soft mt-0.5">{description}</span>}
        </div>
      </div>
      <ChevronRight className={cn("w-4 h-4 text-line-strong group-hover:text-ink-soft transition-colors", danger && "text-danger/50 group-hover:text-danger/70")} />
    </button>
  );
}

function Chips<T extends string>({
  options,
  value,
  onChange,
  vertical,
}: {
  options: { value: T; label: string }[];
  value: T | null | undefined;
  onChange: (v: T) => void;
  vertical?: boolean;
}) {
  return (
    <div className={cn("flex gap-2", vertical ? "flex-col" : "flex-wrap")}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full border px-3.5 py-2 text-[13px] transition-colors text-left",
            value === o.value
              ? "border-primary bg-primary-soft text-primary font-medium"
              : "border-line bg-surface text-ink hover:border-primary/30"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
