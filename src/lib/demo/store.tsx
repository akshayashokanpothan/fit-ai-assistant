"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  BodyMetric,
  ChatMessage,
  Conversation,
  MemoryFact,
  Profile,
  UsageEventType,
} from "@/types";
import {
  DEMO_BODY_METRICS,
  DEMO_CONVERSATION,
  DEMO_MESSAGES,
  DEMO_PROFILE,
  DEMO_USER_ID,
} from "./seed-data";


const STORAGE_KEY = "pace_demo_state_v1";

interface DemoState {
  onboardingComplete: boolean;
  profile: Profile;
  bodyMetrics: BodyMetric[];
  conversation: Conversation;
  messages: ChatMessage[];
  derivedMemory: MemoryFact[];
  usageCount: Record<UsageEventType, number>;
}

function seedState(onboarded: boolean): DemoState {
  return {
    onboardingComplete: onboarded,
    profile: DEMO_PROFILE,
    bodyMetrics: DEMO_BODY_METRICS,
    conversation: DEMO_CONVERSATION,
    messages: DEMO_MESSAGES,
    derivedMemory: [
      {
        id: "mem-1",
        userId: DEMO_USER_ID,
        layer: "derived",
        key: "usual training time",
        value: "typically trains in the evening",
        confidence: 0.6,
        createdAt: new Date().toISOString(),
      },
      {
        id: "mem-2",
        userId: DEMO_USER_ID,
        layer: "derived",
        key: "exercise preference",
        value: "tends to prefer machine exercises over free weights",
        confidence: 0.55,
        createdAt: new Date().toISOString(),
      },
    ],
    usageCount: {
      ai_message: 0,
      image_analysis: 0,
      food_scan: 0,
      screenshot_scan: 0,
      plan_generation: 0,
    },
  };
}

interface DemoStoreValue {
  state: DemoState;
  hydrated: boolean;
  completeOnboarding: (profile: Partial<Profile>) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  updateAvatar: (url: string | null, type: "photo" | "avatar") => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  addBodyMetric: (weightKg: number) => void;
  recordUsage: (type: UsageEventType) => void;
  resetDemo: () => void;
}

const DemoStoreContext = createContext<DemoStoreValue | null>(null);

export function DemoStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(() => seedState(false));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Deliberate one-time hydration read: localStorage is only available
    // client-side, so state must start from the seed default (matching the
    // server-rendered HTML) and then sync from storage after mount. The
    // `hydrated` flag gates all rendering until this completes, so there is
    // no visible flash/mismatch — this is the standard SSR-safe pattern for
    // synchronizing from an external, synchronous browser API.
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        delete parsed.workouts;
        delete parsed.meals;
        delete parsed.activities;
        delete parsed.plans;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState({ ...seedState(false), ...parsed });
      }
    } catch {
      // ignore corrupt storage, keep defaults
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage may be unavailable (private mode) — fail silently for demo
    }
  }, [state, hydrated]);

  const completeOnboarding = useCallback((profile: Partial<Profile>) => {
    setState((s) => ({
      ...s,
      onboardingComplete: true,
      profile: {
        ...s.profile,
        ...profile,
        onboardingCompletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setState((s) => ({
      ...s,
      profile: { ...s.profile, ...patch, updatedAt: new Date().toISOString() },
    }));
  }, []);

  const updateAvatar = useCallback((url: string | null, type: "photo" | "avatar") => {
    setState((s) => ({
      ...s,
      profile: { ...s.profile, avatarUrl: url, avatarType: type, updatedAt: new Date().toISOString() },
    }));
  }, []);

  const addMessage = useCallback((message: ChatMessage) => {
    setState((s) => ({ ...s, messages: [...s.messages, message] }));
  }, []);

  const updateMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setState((s) => ({
      ...s,
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  }, []);



  const addBodyMetric = useCallback((weightKg: number) => {
    setState((s) => ({
      ...s,
      bodyMetrics: [
        ...s.bodyMetrics,
        { id: `bm-${Date.now()}`, userId: DEMO_USER_ID, weightKg, recordedAt: new Date().toISOString() },
      ],
      profile: { ...s.profile, weightKg, updatedAt: new Date().toISOString() },
    }));
  }, []);

  const recordUsage = useCallback((type: UsageEventType) => {
    setState((s) => ({
      ...s,
      usageCount: { ...s.usageCount, [type]: (s.usageCount[type] ?? 0) + 1 },
    }));
  }, []);

  const resetDemo = useCallback(() => {
    const fresh = seedState(false);
    setState(fresh);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<DemoStoreValue>(
    () => ({
      state,
      hydrated,
      completeOnboarding,
      updateProfile,
      updateAvatar,
      addMessage,
      updateMessage,
      addBodyMetric,
      recordUsage,
      resetDemo,
    }),
    [
      state,
      hydrated,
      completeOnboarding,
      updateProfile,
      updateAvatar,
      addMessage,
      updateMessage,
      addBodyMetric,
      recordUsage,
      resetDemo,
    ]
  );

  return <DemoStoreContext.Provider value={value}>{children}</DemoStoreContext.Provider>;
}

export function useDemoStore() {
  const ctx = useContext(DemoStoreContext);
  if (!ctx) throw new Error("useDemoStore must be used within DemoStoreProvider");
  return ctx;
}
