"use client";

import { useEffect, useRef, useState } from "react";
import { useDemoStore } from "@/lib/demo/store";
import { useWorkoutsDAL } from "@/lib/data/workouts";
import { useMealsDAL } from "@/lib/data/meals";
import { useProfileDAL } from "@/lib/data/profile";
import { useActivitiesDAL } from "@/lib/data/activities";
import { usePlansDAL } from "@/lib/data/plans";
import { useHistoryDAL } from "@/lib/data/history";
import { usePwa } from "@/lib/pwa/pwa-context";
import { buildAIContext } from "@/lib/demo/build-context";
import type { ChatMessage, MealItem, MealType } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { QuickActions } from "@/components/chat/quick-actions";
import { MealReviewCard } from "@/components/chat/meal-review-card";
import { ActivityReviewCard, type ActivityDraft } from "@/components/chat/activity-review-card";
import { WorkoutPreviewCard } from "@/components/chat/workout-preview-card";
import { PlanPreviewCard } from "@/components/chat/plan-preview-card";
import { TodaySummaryCard } from "@/components/chat/today-summary-card";
import { PwaEngagementModal, PwaToasts } from "@/components/pwa-modals";
import { Camera, Send, TriangleAlert, X, Image as ImageIcon, Sparkles, Bot, Info, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Workout, Plan, AIContext, Profile, Meal, Activity } from "@/types";

const WELCOME_MESSAGE_ID = "msg-welcome";

/**
 * The seeded welcome message (src/lib/demo/seed-data.ts) is deliberately
 * name-neutral — this renders it personalized using the authenticated
 * Supabase profile instead. Chat message persistence itself stays on the
 * demo store; only the displayed text for this one known message is
 * computed dynamically.
 */
function greetingContent(
  profile: Profile | null,
  meals: Meal[],
  workouts: Workout[],
  activities: Activity[]
): string {
  const name = profile?.displayName?.trim();
  const today = new Date().toISOString().slice(0, 10);
  
  const todaysMeals = meals.filter(m => m.eventTime && m.eventTime.startsWith(today) && m.confirmationState === 'confirmed');
  const todaysWorkouts = workouts.filter(w => w.scheduledFor === today);
  const todaysActivities = activities.filter(a => a.eventDate === today);

  const hasMeals = todaysMeals.length > 0;
  const hasWorkouts = todaysWorkouts.length > 0;
  const hasSteps = todaysActivities.some(a => a.steps && a.steps > 0);

  const greeting = name ? `Good to see you, ${name}.` : `Good to see you.`;

  if (!hasMeals && !hasWorkouts && !hasSteps) {
    return `${greeting} Ready to crush your goals today? You can log a meal, plan a workout, or ask me anything.`;
  }

  const parts = [];
  if (hasMeals) parts.push(`I've got your meals logged`);
  if (hasSteps) parts.push(`tracked your steps`);
  
  let base = "";
  if (parts.length > 0) {
    base = `${parts.join(' and ')}. `;
  }
  
  if (hasWorkouts) {
    base += "Your workout for today is set. Ready to get started?";
  } else {
    base += "Want to plan today's workout, or check in on how the day's going?";
  }

  return `${greeting} ${base}`;
}

interface PendingImage {
  base64: string;
  mediaType: string;
  previewUrl: string;
  mediaUploadId: string;
}

export default function AIPage() {
  const { recordUsage, state: demoState } = useDemoStore();
  const { messages, conversation, addMessage, updateMessage, historyLoading } = useHistoryDAL();
  const { workouts } = useWorkoutsDAL();
  const { meals, confirmMeal } = useMealsDAL();
  const { activities, confirmActivity } = useActivitiesDAL();
  const { plans } = usePlansDAL();
  const { profile } = useProfileDAL();
  const { deferredPrompt, promptInstall, isInstalled } = usePwa();
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [menuExpanded, setMenuExpanded] = useState(false);
  
  // PWA Modal state
  const [showEngagementModal, setShowEngagementModal] = useState(false);
  const [showRemindLaterToast, setShowRemindLaterToast] = useState(false);
  const [showInstallSuccess, setShowInstallSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  function pushMessage(msg: ChatMessage) {
    addMessage(msg);
  }

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    if (!profile) {
      // Defensive only — the parent (app) layout already gates this page
      // behind a loaded, onboarded profile. Never silently fall back to
      // the seeded demo profile for an authenticated user.
      pushMessage({
        id: `msg-${Date.now()}-profile-error`,
        conversationId: conversation?.id ?? "default",
        role: "assistant",
        content: "I couldn't load your profile just now. Please refresh and try again.",
        createdAt: new Date().toISOString(),
        status: "sent",
      });
      return;
    }

    setInput("");

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversationId: conversation?.id ?? "default",
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
      status: "sent",
    };
    pushMessage(userMsg);

    const thinkingId = `msg-${Date.now()}-thinking`;
    pushMessage({
      id: thinkingId,
      conversationId: conversation?.id ?? "default",
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      status: "sending",
    });

    setBusy(true);
    recordUsage("ai_message");

    try {
      const context: AIContext = buildAIContext(profile, demoState, workouts, meals, activities, plans);
      const history = messages
        .filter((m) => m.status !== "sending")
        .slice(-10)
        .map((m) => ({ 
          role: m.role as "user" | "assistant", 
          content: m.id === WELCOME_MESSAGE_ID ? greetingContent(profile, meals, workouts, activities) : m.content 
        }))
        .filter((m) => m.content.trim().length > 0);

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: trimmed, history, context }),
      });

      if (!res.ok) throw new Error("chat_failed");
      const data = (await res.json()) as { reply: string; card?: ChatMessage["card"] };

      updateMessage(thinkingId, { content: data.reply, card: data.card, status: "sent" });
      
      // Phase 8 PWA Trigger
      if (!isInstalled && typeof window !== "undefined") {
        const pwaPromptShown = localStorage.getItem("pace_pwa_prompt_shown");
        if (!pwaPromptShown) {
          setTimeout(() => {
            setShowEngagementModal(true);
            // Persist only after the modal has actually fired so a page
            // refresh before the 10s elapses doesn't consume the one-time prompt.
            localStorage.setItem("pace_pwa_prompt_shown", "true");
          }, 10000);
        }
      }
    } catch {
      updateMessage(thinkingId, {
        content:
          "Something went wrong reaching the assistant. Please check your connection and try again.",
        status: "failed",
      });
    } finally {
      setBusy(false);
    }
  }

  function onQuickAction(prompt: string) {
    if (prompt === "Log a meal") {
      setMenuExpanded(true);
      return;
    }
    sendText(prompt);
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      setPendingImage({
        base64,
        mediaType: file.type || "image/jpeg",
        previewUrl: dataUrl,
        mediaUploadId: `media-${Date.now()}`,
      });
    };
    reader.readAsDataURL(file);
  }

  async function analyzePendingImage(kind: "meal" | "screenshot") {
    if (!pendingImage || busy) return;
    const image = pendingImage;
    setPendingImage(null);
    setBusy(true);

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversationId: conversation?.id ?? "default",
      role: "user",
      content: kind === "meal" ? "Here's my meal" : "Here's my activity screenshot",
      attachments: [
        {
          id: image.mediaUploadId,
          kind: "image",
          mediaUploadId: image.mediaUploadId,
          previewUrl: image.previewUrl,
          status: "processing",
        },
      ],
      createdAt: new Date().toISOString(),
      status: "sent",
    };
    pushMessage(userMsg);

    const thinkingId = `msg-${Date.now()}-thinking`;
    pushMessage({
      id: thinkingId,
      conversationId: conversation?.id ?? "default",
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      status: "sending",
    });

    recordUsage("image_analysis");
    recordUsage(kind === "meal" ? "food_scan" : "screenshot_scan");

    try {
      const endpoint = kind === "meal" ? "/api/ai/analyze-image" : "/api/ai/analyze-screenshot";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64: image.base64, mediaType: image.mediaType }),
      });
      const data = await res.json();

      if (!res.ok) {
        updateMessage(thinkingId, {
          content: data.error ?? "I couldn't process that image. Please try again.",
          status: "sent",
        });
        return;
      }

      if (kind === "meal") {
        updateMessage(thinkingId, {
          content: describeDetectedMeal(data.items),
          status: "sent",
          card: { kind: "meal_review", data: { items: data.items, mediaUploadId: image.mediaUploadId } },
        });
      } else {
        updateMessage(thinkingId, {
          content: "Here's what I found in the screenshot:",
          status: "sent",
          card: { kind: "activity_review", data: { draft: data.draft, mediaUploadId: image.mediaUploadId } },
        });
      }
    } catch {
      updateMessage(thinkingId, {
        content: "Something went wrong analyzing that image. Please try again.",
        status: "failed",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col">
      <div className="flex items-center justify-between border-b border-line bg-surface/90 px-4 py-2.5 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-[#335f42]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-ink leading-tight">Pace AI Coach</span>
            <span className="text-[11px] text-ink-soft">Online & ready to help</span>
          </div>
        </div>
        <button aria-label="Info">
          <Info className="h-5 w-5 text-ink-soft" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-3">
        <div className="space-y-5 pb-4">
          {messages.length === 1 && messages[0].id === WELCOME_MESSAGE_ID ? (
            <div className="flex flex-col items-center pt-6 pb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-20 h-20 bg-[#f7eedc] rounded-full flex items-center justify-center mb-5 shadow-sm overflow-hidden relative">
                 <Bot className="w-10 h-10 text-[#335f42] relative z-10" />
                 <Sparkles className="w-4 h-4 text-orange-400 absolute top-4 right-4" />
              </div>
              
              <h2 className="text-[26px] font-medium text-ink mb-2 text-center tracking-tight px-4 font-serif">
                Good morning,<br />Akshay 👋
              </h2>
              
              <p className="text-[14px] text-ink-soft text-center px-6 mb-8 leading-relaxed">
                I&apos;m your fitness coach.<br />How can I help you today?
              </p>
              
              <div className="w-full">
                <QuickActions onPick={onQuickAction} variant="empty" />
              </div>

              <div className="mt-6 flex items-center justify-center gap-1.5 text-muted">
                <Lock className="h-3 w-3" />
                <span className="text-[11px]">Your data is private and secure</span>
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const displayMessage =
                m.id === WELCOME_MESSAGE_ID ? { ...m, content: greetingContent(profile, meals, workouts, activities) } : m;
              return (
                <MessageBubble
                  key={m.id}
                  message={displayMessage}
                  onConfirmMeal={async (items, mealType, mediaUploadId) => {
                    await confirmMeal(mealType, items, "image_ai", mediaUploadId);
                  }}
                  onConfirmActivity={(draft) => {
                    confirmActivity(draft, "screenshot_ai");
                  }}
                />
              );
            })
          )}

          {/* History hydration loading state — shown only while the initial
              Supabase fetch is in-flight after a refresh. Fades once resolved. */}
          {historyLoading && (
            <div className="flex items-center gap-2.5 pl-1 text-sm text-ink-soft">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft [animation-delay:300ms]" />
              </span>
              <span>Retrieving your conversation...</span>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </div>

      <div className="border-t border-line bg-surface px-4 pt-3">
        {pendingImage && (
          <div className="mb-3 flex items-center gap-3 rounded-[var(--radius-md)] border border-line-strong bg-paper p-2.5">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[var(--radius-sm)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pendingImage.previewUrl}
                alt="Selected"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="text-xs text-ink-soft">What is this photo?</p>
              <div className="mt-1.5 flex gap-1.5">
                <button
                  onClick={() => analyzePendingImage("meal")}
                  className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary"
                >
                  Meal photo
                </button>
                <button
                  onClick={() => analyzePendingImage("screenshot")}
                  className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent"
                >
                  Activity screenshot
                </button>
              </div>
            </div>
            <button
              onClick={() => setPendingImage(null)}
              aria-label="Remove image"
              className="text-muted hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Only show bottom pills if we're not in the empty state */}
        {(messages.length > 1 || (messages.length === 1 && messages[0].id !== WELCOME_MESSAGE_ID)) && (
          <div className="mb-3">
            <QuickActions onPick={onQuickAction} variant="active" />
          </div>
        )}

        <div className="flex items-center gap-3 pb-3 relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              setMenuExpanded(false);
              onFileSelected(e);
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              setMenuExpanded(false);
              onFileSelected(e);
            }}
          />
          
          <div className="relative">
            {menuExpanded && (
              <div className="absolute bottom-14 left-0 flex flex-col gap-3 animate-in slide-in-from-bottom-2 fade-in duration-200">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center gap-3 w-max group"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface border border-line shadow-sm group-hover:bg-line-strong text-ink transition-colors">
                    <Camera className="h-5 w-5" />
                  </div>
                  <span className="text-[13px] font-medium text-ink bg-surface/90 px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm border border-line-strong">
                    Open Camera
                  </span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-3 w-max group"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface border border-line shadow-sm group-hover:bg-line-strong text-ink transition-colors">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <span className="text-[13px] font-medium text-ink bg-surface/90 px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm border border-line-strong">
                    Choose from Gallery
                  </span>
                </button>
              </div>
            )}
            
            {menuExpanded && (
              <div 
                className="fixed inset-0 z-[-1]" 
                onClick={() => setMenuExpanded(false)}
                aria-hidden="true"
              />
            )}

            <button
              onClick={() => setMenuExpanded(!menuExpanded)}
              aria-label={menuExpanded ? "Close menu" : "Attach media"}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-line bg-surface transition-all duration-200 shadow-sm",
                menuExpanded 
                  ? "bg-primary-soft text-primary rotate-90" 
                  : "text-ink hover:bg-black/[0.04]"
              )}
            >
              {menuExpanded ? <X className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
            </button>
          </div>
          
          <div className="flex flex-1 items-center rounded-full border border-line-strong bg-surface pl-4 pr-1.5 py-1.5 shadow-sm">
            <input
              placeholder="Ask your coach anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendText(input);
                }
              }}
              className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted py-1"
            />
            <button
              aria-label="Send"
              disabled={!input.trim() || busy}
              onClick={() => sendText(input)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full bg-[#335f42] text-white transition-opacity",
                (!input.trim() || busy) && "opacity-50"
              )}
            >
              <Send className="h-4 w-4 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
      
      <PwaEngagementModal 
        open={showEngagementModal} 
        onOpenChange={setShowEngagementModal}
        hasBeforeInstallPrompt={!!deferredPrompt}
        onInstall={async () => {
          if (deferredPrompt) {
            const outcome = await promptInstall();
            if (outcome === "accepted") {
              setShowEngagementModal(false);
              setShowInstallSuccess(true);
            }
          }
        }}
        onRemindLater={() => {
          setShowEngagementModal(false);
          setShowRemindLaterToast(true);
        }}
      />
      
      <PwaToasts 
        showRemindLater={showRemindLaterToast}
        showInstallSuccess={showInstallSuccess}
        onCloseRemindLater={() => setShowRemindLaterToast(false)}
        onCloseInstallSuccess={() => setShowInstallSuccess(false)}
      />
    </div>
  );
}

function describeDetectedMeal(items: MealItem[]) {
  if (!items?.length) return "Here's what I found:";
  const label = items.map((i) => `${i.quantityLabel} ${i.name}`).join(", ");
  return `Looks like ${label}. Take a look below.`;
}

function MessageBubble({
  message,
  onConfirmMeal,
  onConfirmActivity,
}: {
  message: ChatMessage;
  onConfirmMeal: (items: MealItem[], mealType: MealType, mediaUploadId?: string) => Promise<void>;
  onConfirmActivity: (draft: ActivityDraft) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("flex max-w-[85%] flex-col", isUser ? "items-end" : "items-start")}>
        {message.status === "sending" ? (
          <TypingIndicator />
        ) : message.content || (message.attachments && message.attachments.length > 0) ? (
          <div className={cn("flex", isUser ? "justify-end" : "justify-start mb-4")}>
            {!isUser && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-ink mr-3 shadow-sm border border-line-strong mt-1">
                <Bot className="h-4 w-4 text-[#335f42]" />
              </div>
            )}
            <div
              className={cn(
                "rounded-[24px] px-4 py-3 text-[15px] leading-relaxed",
                isUser 
                  ? "bg-[#335f42] text-white rounded-tr-md shadow-sm" 
                  : "bg-surface border border-line text-ink rounded-tl-md shadow-sm",
                message.card?.kind === "safety_notice" && "border-danger-soft bg-danger-soft text-ink"
              )}
            >
              {message.attachments?.length ? (
                <div className="flex flex-col gap-2 mb-2">
                  {message.attachments.map((a) => (
                    <div key={a.id} className="relative h-40 w-48 overflow-hidden rounded-[16px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.previewUrl} alt="Attached" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : null}

              {message.card?.kind === "safety_notice" && (
                <div className="mb-2 flex items-center gap-1.5 text-danger font-medium">
                  <TriangleAlert className="h-4 w-4" />
                  <span className="text-[13px]">Please read this</span>
                </div>
              )}
              {message.content}
            </div>
          </div>
        ) : null}

        {message.status === "failed" && (
          <span className="mt-1 text-xs text-danger">Failed to send</span>
        )}

        {message.card?.kind === "meal_review" && (
          <MealReviewCard
            initialItems={(message.card.data as { items: MealItem[] }).items}
            onConfirm={async (items, mealType) =>
              await onConfirmMeal(
                items,
                mealType,
                (message.card!.data as { mediaUploadId?: string }).mediaUploadId
              )
            }
          />
        )}

        {message.card?.kind === "activity_review" && (
          <ActivityReviewCard
            draft={(message.card.data as { draft: ActivityDraft }).draft}
            onConfirm={onConfirmActivity}
          />
        )}

        {message.card?.kind === "workout_preview" && (
          <WorkoutPreviewCard workout={message.card.data as Workout} />
        )}

        {message.card?.kind === "plan_preview" && (
          <PlanPreviewCard plan={message.card.data as Plan} />
        )}

        {message.card?.kind === "today_summary" && (
          <TodaySummaryCard today={message.card.data as AIContext["today"]} />
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-ink mr-3 shadow-sm border border-line-strong mt-1">
        <Bot className="h-4 w-4 text-[#335f42] animate-pulse" />
      </div>
      <div className="flex items-center gap-3 rounded-[20px] rounded-tl-sm border border-line-strong bg-surface px-4 py-3 shadow-sm">
        <span className="text-[14px] text-ink-soft font-medium animate-pulse">Coach is thinking</span>
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-soft [animation-delay:-0.2s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-soft [animation-delay:-0.1s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-soft" />
        </div>
      </div>
    </div>
  );
}
