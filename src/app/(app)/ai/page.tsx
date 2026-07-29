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
import { Camera, Send, TriangleAlert, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Workout, Plan, AIContext, Profile } from "@/types";

const WELCOME_MESSAGE_ID = "msg-welcome";

/**
 * The seeded welcome message (src/lib/demo/seed-data.ts) is deliberately
 * name-neutral — this renders it personalized using the authenticated
 * Supabase profile instead. Chat message persistence itself stays on the
 * demo store; only the displayed text for this one known message is
 * computed dynamically.
 */
function greetingContent(profile: Profile | null): string {
  const name = profile?.displayName?.trim();
  const base =
    "I've got today's breakfast and lunch logged, plus your step count. Want to plan today's workout, or check in on how the day's going?";
  return name ? `Good to see you, ${name}. ${base}` : `Good to see you. ${base}`;
}

interface PendingImage {
  base64: string;
  mediaType: string;
  previewUrl: string;
  mediaUploadId: string;
}

export default function AIPage() {
  const { recordUsage, state: demoState } = useDemoStore();
  const { messages, conversation, addMessage, updateMessage } = useHistoryDAL();
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
          content: m.id === WELCOME_MESSAGE_ID ? greetingContent(profile) : m.content 
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
          localStorage.setItem("pace_pwa_prompt_shown", "true");
          setTimeout(() => {
            setShowEngagementModal(true);
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
      <div className="flex-1 overflow-y-auto px-4 pt-5">
        <div className="space-y-5 pb-4">
          {messages.map((m) => {
            const displayMessage =
              m.id === WELCOME_MESSAGE_ID ? { ...m, content: greetingContent(profile) } : m;
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
          })}
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

        <div className="mb-3">
          <QuickActions onPick={onQuickAction} />
        </div>

        <div className="flex items-end gap-2 pb-3 relative">
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
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-200",
                menuExpanded 
                  ? "bg-primary-soft text-primary rotate-90" 
                  : "text-ink-soft hover:bg-black/[0.04]"
              )}
            >
              {menuExpanded ? <X className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
            </button>
          </div>
          <Textarea
            rows={1}
            placeholder="What's on your mind?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendText(input);
              }
            }}
            className="max-h-28 min-h-11 flex-1 py-2.5"
          />
          <Button
            size="icon"
            aria-label="Send"
            disabled={!input.trim() || busy}
            onClick={() => sendText(input)}
          >
            <Send className="h-4 w-4" />
          </Button>
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
        {message.attachments?.map((a) => (
          <div key={a.id} className="relative mb-1.5 h-40 w-40 overflow-hidden rounded-[var(--radius-md)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.previewUrl} alt="Attached" className="h-full w-full object-cover" />
          </div>
        ))}

        {message.status === "sending" ? (
          <TypingIndicator />
        ) : message.content ? (
          <div
            className={cn(
              "rounded-[var(--radius-md)] px-4 py-2.5 text-[15px] leading-relaxed",
              isUser ? "bg-primary text-primary-ink" : "bg-surface border border-line text-ink",
              message.card?.kind === "safety_notice" && "border-danger-soft bg-danger-soft text-ink"
            )}
          >
            {message.card?.kind === "safety_notice" && (
              <div className="mb-1.5 flex items-center gap-1.5 text-danger">
                <TriangleAlert className="h-4 w-4" />
                <span className="text-xs font-medium">Please read this</span>
              </div>
            )}
            {message.content}
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
    <div className="flex items-center gap-1 rounded-[var(--radius-md)] border border-line bg-surface px-4 py-3">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.2s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.1s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
    </div>
  );
}
