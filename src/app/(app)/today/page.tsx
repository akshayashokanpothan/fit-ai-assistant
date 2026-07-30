"use client";

import { useMemo } from "react";
import { useWorkoutsDAL } from "@/lib/data/workouts";
import { useMealsDAL } from "@/lib/data/meals";
import { useActivitiesDAL } from "@/lib/data/activities";
import { useProfileDAL } from "@/lib/data/profile";
import { useBodyMetricsDAL } from "@/lib/data/body-metrics";
import { estimateDailyTargets } from "@/lib/nutrition/targets";
import { Button } from "@/components/ui/button";
import { sumNutrition } from "@/lib/nutrition/seed-foods";
import { 
  Flame, 
  Droplet, 
  Footprints, 
  Dumbbell, 
  UtensilsCrossed, 
  MessageCircle, 
  Check, 
  ChevronRight, 
  Sparkles,
  Camera,
  CalendarPlus,
  Moon,
  Sun
} from "lucide-react";
import { formatISO } from "date-fns";
import { WeightProgressChart } from "@/components/weight-progress-chart";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function TodayPage() {
  const { workouts, loading: workoutsLoading } = useWorkoutsDAL();
  const { meals, loading: mealsLoading } = useMealsDAL();
  const { profile, loading: profileLoading } = useProfileDAL();
  const { activities } = useActivitiesDAL();
  const { bodyMetrics } = useBodyMetricsDAL();
  
  const today = formatISO(new Date(), { representation: "date" });

  const todaysMeals = useMemo(
    () =>
      meals
        .filter((m) => m.eventTime.slice(0, 10) === today && m.confirmationState === "confirmed")
        .sort((a, b) => a.eventTime.localeCompare(b.eventTime)),
    [meals, today]
  );
  const todaysActivity = activities.filter((a) => a.eventDate === today && a.confirmationState === "confirmed");
  const todaysWorkout = workouts.find((w) => w.scheduledFor === today);

  if (profileLoading || workoutsLoading || mealsLoading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line-strong border-t-primary" />
      </div>
    );
  }

  // Calculate totals and targets
  const targets = estimateDailyTargets(profile);
  const totals = sumNutrition(todaysMeals.map((m) => m.totalNutrition));
  const summary = {
    kcal: Math.round(totals.kcal),
    proteinG: Math.round(totals.proteinG),
  };

  const steps = todaysActivity.reduce((acc, a) => acc + (a.steps || 0), 0);
  const stepsTarget = 10000;

  // Determine greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const firstName = profile.displayName ? profile.displayName.split(" ")[0] : "there";

  return (
    <div className="px-5 pt-4 pb-8 space-y-6">
      
      {/* 1. Header (Greeting + Goal Progress) */}
      <section>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="font-display text-[26px] font-bold text-ink flex items-center gap-2">
              {greeting}, {firstName} <span role="img" aria-label="wave">👋</span>
            </h1>
            <p className="mt-1 text-[13px] text-ink-soft">
              You&apos;re building a healthier you. Keep going!
            </p>
          </div>
          
          <div className="text-right">
            <span className="block text-[11px] font-medium text-ink-soft mb-1">Weight goal</span>
            {/* The user specifically asked to NOT use a mock target weight. Show 'Set your target weight' if absent. */}
            <div className="flex items-center gap-1.5 justify-end mb-1">
              <span className="font-bold text-[16px] text-ink">{profile.weightKg || "--"} <span className="text-[13px] font-medium">kg</span></span>
              {/* As profile type doesn't have target weight, we follow the requirement to show empty state */}
              <span className="text-ink-soft">→</span>
              <span className="font-bold text-[16px] text-ink-soft">-- <span className="text-[13px] font-medium">kg</span></span>
            </div>
            <div className="h-1.5 w-[100px] bg-line rounded-full overflow-hidden ml-auto">
               {/* No real progress value since we don't have a target weight in schema */}
               <div className="h-full bg-primary w-[0%]" />
            </div>
            <span className="block text-[10px] text-ink-soft mt-1">Set your target weight</span>
          </div>
        </div>
      </section>

      {/* 2. Last 7 Days Progress Graph */}
      <section>
         <WeightProgressChart metrics={bodyMetrics} />
      </section>

      {/* 3. Daily Metrics (Horizontal Scroll) */}
      {(summary.kcal > 0 || steps > 0) && (
        <section className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 -mx-5 px-5">
        {/* Calories */}
        <div className="min-w-[140px] rounded-[16px] bg-surface border border-line p-4 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
             <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-500">
               <Flame className="w-3.5 h-3.5" />
             </div>
             <span className="text-[13px] font-medium text-ink">Calories</span>
          </div>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="font-display font-bold text-[20px] text-ink">{summary.kcal.toLocaleString()}</span>
            <span className="text-[13px] font-medium text-ink-soft">/ {targets.kcal.toLocaleString()}</span>
          </div>
          <div className="h-1.5 w-full bg-line rounded-full overflow-hidden mb-2">
             <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(100, (summary.kcal / (targets.kcal || 1)) * 100)}%` }} />
          </div>
          <span className="text-[11px] text-ink-soft">{(targets.kcal || 0) - summary.kcal} kcal left</span>
        </div>

        {/* Protein */}
        <div className="min-w-[140px] rounded-[16px] bg-surface border border-line p-4 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
             <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600">
               {/* Using a custom pill icon for protein or dumbbell */}
               <Dumbbell className="w-3.5 h-3.5" />
             </div>
             <span className="text-[13px] font-medium text-ink">Protein</span>
          </div>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="font-display font-bold text-[20px] text-ink">{summary.proteinG}</span>
            <span className="text-[13px] font-medium text-ink-soft">/ {targets.proteinG} g</span>
          </div>
          <div className="h-1.5 w-full bg-line rounded-full overflow-hidden mb-2">
             <div className="h-full bg-green-600 rounded-full" style={{ width: `${Math.min(100, (summary.proteinG / (targets.proteinG || 1)) * 100)}%` }} />
          </div>
          <span className="text-[11px] text-ink-soft">{(targets.proteinG || 0) - summary.proteinG} g left</span>
        </div>

        {/* Water */}
        <div className="min-w-[140px] rounded-[16px] bg-surface border border-line p-4 flex-shrink-0 opacity-70">
          <div className="flex items-center gap-2 mb-3">
             <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
               <Droplet className="w-3.5 h-3.5" />
             </div>
             <span className="text-[13px] font-medium text-ink">Water</span>
          </div>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="font-display font-bold text-[20px] text-ink">-</span>
            <span className="text-[13px] font-medium text-ink-soft">/ 3 L</span>
          </div>
          <div className="h-1.5 w-full bg-line rounded-full overflow-hidden mb-2">
             <div className="h-full bg-blue-500 w-[0%]" />
          </div>
          <span className="text-[11px] text-ink-soft">Not tracked yet</span>
        </div>

        {/* Steps */}
        <div className="min-w-[140px] rounded-[16px] bg-surface border border-line p-4 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
             <div className="w-6 h-6 rounded-full bg-primary-soft flex items-center justify-center text-primary">
               <Footprints className="w-3.5 h-3.5" />
             </div>
             <span className="text-[13px] font-medium text-ink">Steps</span>
          </div>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="font-display font-bold text-[20px] text-ink">{steps.toLocaleString()}</span>
          </div>
          <div className="h-1.5 w-full bg-line rounded-full overflow-hidden mb-2">
             <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (steps / stepsTarget) * 100)}%` }} />
          </div>
          <span className="text-[11px] text-ink-soft">Goal: {stepsTarget.toLocaleString()}</span>
        </div>

        {/* Spacer for proper right padding on scroll */}
        <div className="w-1 flex-shrink-0" aria-hidden="true" />
      </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 4. Today's Workout Card */}
        <section className="rounded-[20px] bg-surface border border-line p-5 relative overflow-hidden flex flex-col justify-between min-h-[180px]">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Dumbbell className="w-4 h-4 text-primary" />
              <span className="text-[13px] font-bold text-ink">Today&apos;s workout</span>
            </div>
            {todaysWorkout ? (
              <>
                <h3 className="font-display text-[22px] font-bold text-ink leading-tight mb-2">
                  {todaysWorkout.title || "Custom Workout"}
                </h3>
                <p className="text-[13px] text-ink-soft mb-4">
                  {todaysWorkout.exercises.length} exercises
                </p>
                {/* Visual support tags */}
                <div className="flex gap-2 flex-wrap mb-4 relative z-10">
                  <span className="bg-paper border border-line text-ink-soft text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                    Strength
                  </span>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-display text-[22px] font-bold text-ink leading-tight mb-2 text-ink-soft">
                  Rest day
                </h3>
                <p className="text-[13px] text-ink-soft mb-4">
                  No workout scheduled
                </p>
              </>
            )}
          </div>
          
          <div className="w-full relative z-10">
            {todaysWorkout ? (
              <Link 
                href={`/workout/${todaysWorkout.id}`}
                className="w-full flex items-center justify-center bg-[#335f42] hover:bg-[#254530] text-white rounded-[12px] h-11 font-medium transition-colors"
              >
                Start workout
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            ) : (
              <Link 
                href="/ai"
                className="w-full flex items-center justify-center bg-[#335f42] hover:bg-[#254530] text-white rounded-[12px] h-11 font-medium transition-colors"
              >
                Plan a workout
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            )}
          </div>

          {/* Decorative illustration placeholder */}
          <div className="absolute -right-4 bottom-12 opacity-20 pointer-events-none">
            <Dumbbell className="w-32 h-32 text-primary" />
          </div>
        </section>

        {/* 5. Meals Today Card */}
        <section className="rounded-[20px] bg-[#fbfaf8] border border-[#f0eee9] p-5">
          <div className="flex items-center gap-2 mb-4">
            <UtensilsCrossed className="w-4 h-4 text-orange-500" />
            <span className="text-[13px] font-bold text-ink">Meals today</span>
          </div>

          <div className="space-y-4">
            {["breakfast", "lunch", "dinner"].map((mealType) => {
              const loggedMeal = todaysMeals.find((m) => m.mealType === mealType);
              
              let Icon = Sun;
              if (mealType === "breakfast") Icon = Sun; // sunrise equivalent
              if (mealType === "lunch") Icon = Sun;
              if (mealType === "dinner") Icon = Moon;

              return (
                <div key={mealType} className="flex justify-between items-start">
                   <div className="flex gap-3">
                     <Icon className={cn("w-4 h-4 mt-0.5", loggedMeal ? "text-orange-400" : "text-ink-soft/40")} />
                     <div>
                       <span className="block font-bold text-[14px] text-ink capitalize mb-0.5">{mealType}</span>
                       <span className="block text-[12px] text-ink-soft line-clamp-1 max-w-[160px]">
                         {loggedMeal 
                           ? loggedMeal.items.map(i => i.name).join(", ") 
                           : `Plan your ${mealType}`}
                       </span>
                     </div>
                   </div>
                   {loggedMeal ? (
                     <div className="flex items-center gap-1 text-primary">
                       <Check className="w-3.5 h-3.5" />
                       <span className="text-[11px] font-medium">Logged</span>
                     </div>
                   ) : (
                     <Link href="/ai" className="flex items-center gap-1 text-orange-500 hover:text-orange-600 transition-colors">
                       <span className="text-[11px] font-medium">Plan now</span>
                       <ChevronRight className="w-3.5 h-3.5" />
                     </Link>
                   )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* 6. Coach Insight Card */}
      <section className="rounded-[20px] bg-primary-soft/40 border border-primary/20 p-5 flex items-start gap-4">
         <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm text-primary">
           <Sparkles className="w-5 h-5" />
         </div>
         <div className="flex-1">
           <span className="block text-[12px] text-ink-soft mb-1 font-medium">Coach insight</span>
           {summary.proteinG < (targets.proteinG || 120) * 0.5 && hour >= 14 ? (
             <>
               <span className="block font-bold text-[14px] text-ink mb-1">Your protein intake is a bit low today.</span>
               <span className="block text-[13px] text-ink-soft">Try adding a high-protein option at dinner to stay on track.</span>
             </>
           ) : summary.kcal < (targets.kcal || 2000) * 0.3 && hour >= 12 ? (
             <>
               <span className="block font-bold text-[14px] text-ink mb-1">You&apos;re running low on calories.</span>
               <span className="block text-[13px] text-ink-soft">Make sure to have a balanced meal to keep your energy up.</span>
             </>
           ) : (
             <>
               <span className="block font-bold text-[14px] text-ink mb-1">You&apos;re doing great today!</span>
               <span className="block text-[13px] text-ink-soft">Keep sticking to your plan. Consistency is key to building a healthier you.</span>
             </>
           )}
         </div>
      </section>

      {/* 7. Quick Actions */}
      <section>
        <h2 className="text-[14px] font-bold text-ink mb-3 px-1">Quick actions</h2>
        <div className="flex flex-col gap-3">
          <Link href="/ai" className="w-full flex items-center justify-center rounded-[12px] h-12 bg-surface text-[14px] font-medium text-ink hover:bg-line-soft border border-line shadow-sm transition-colors">
            <Camera className="w-4 h-4 mr-2 text-primary" />
            Scan meal
          </Link>
          <Link href="/ai" className="w-full flex items-center justify-center rounded-[12px] h-12 bg-surface text-[14px] font-medium text-ink hover:bg-line-soft border border-line shadow-sm transition-colors">
            <CalendarPlus className="w-4 h-4 mr-2 text-primary" />
            Plan workout
          </Link>
          <Link href="/ai" className="w-full flex items-center justify-center rounded-[12px] h-12 bg-surface text-[14px] font-medium text-ink hover:bg-line-soft border border-line shadow-sm transition-colors">
            <MessageCircle className="w-4 h-4 mr-2 text-primary" />
            Ask coach
          </Link>
        </div>
      </section>

    </div>
  );
}
