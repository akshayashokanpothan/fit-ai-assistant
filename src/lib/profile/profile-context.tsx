"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import {
  ensureProfile,
  updateProfile as updateProfileRow,
  completeOnboarding as completeOnboardingRow,
  setAvatar as setAvatarQuery,
  type ProfileWritable,
} from "./queries";
import type { Profile } from "@/types";

interface ProfileResult {
  error: string | null;
}

interface ProfileContextValue {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  updateProfile: (patch: ProfileWritable) => Promise<ProfileResult>;
  completeOnboarding: (patch: ProfileWritable) => Promise<ProfileResult>;
  updateAvatar: (url: string | null, type: "photo" | "avatar") => Promise<ProfileResult>;
  refetchProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

/**
 * Profile state, sourced from `public.profiles` — the single source of
 * truth for persisted profile/onboarding data as of Phase 2. Deliberately
 * does not manage its own auth state; it only reacts to `useAuth()`.
 */
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guards against a slow ensure/fetch resolving after the signed-in user
  // has changed (signed out, or a different user signed in) — without
  // this, a late response could clobber state with data for the wrong
  // user, or resurrect a profile after sign-out.
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (userId: string) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const p = await ensureProfile(supabase, userId);
        if (requestIdRef.current !== requestId) return;
        setProfile(p);
      } catch (err) {
        if (requestIdRef.current !== requestId) return;
        setError(err instanceof Error ? err.message : "Couldn't load your profile.");
        setProfile(null);
      } finally {
        if (requestIdRef.current === requestId) setLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    // Wait for auth to resolve before doing anything — avoids firing a
    // fetch/ensure for a momentarily-null user during session restoration.
    if (authLoading) return;

    if (!user) {
      // Deliberate reaction to an external system (the auth session
      // clearing) — not derivable state, since profile/loading/error need
      // to be reset the instant sign-out is observed. Matches the same
      // justified exception used in src/lib/demo/store.tsx.
      requestIdRef.current++; // invalidate any in-flight load
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile(null);
      setError(null);
      setLoading(false);
      return;
    }

    load(user.id);
  }, [authLoading, user, load]);

  const handleUpdate = useCallback(
    async (patch: ProfileWritable): Promise<ProfileResult> => {
      if (!user) return { error: "Not signed in." };
      try {
        const updated = await updateProfileRow(supabase, user.id, patch);
        setProfile(updated);
        return { error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Couldn't save your profile.";
        setError(message);
        return { error: message };
      }
    },
    [supabase, user]
  );

  const handleCompleteOnboarding = useCallback(
    async (patch: ProfileWritable): Promise<ProfileResult> => {
      if (!user) return { error: "Not signed in." };
      try {
        const updated = await completeOnboardingRow(supabase, user.id, patch);
        setProfile(updated);
        return { error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Couldn't save your profile.";
        setError(message);
        return { error: message };
      }
    },
    [supabase, user]
  );

  const handleUpdateAvatar = useCallback(
    async (url: string | null, type: "photo" | "avatar"): Promise<ProfileResult> => {
      if (!user) return { error: "Not signed in." };
      try {
        await setAvatarQuery(supabase, user.id, url, type);
        setProfile((prev) => (prev ? { ...prev, avatarUrl: url, avatarType: type } : null));
        return { error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Couldn't save your avatar.";
        setError(message);
        return { error: message };
      }
    },
    [supabase, user]
  );

  const refetchProfile = useCallback(async () => {
    if (!user) return;
    await load(user.id);
  }, [user, load]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      // Surfaced as one combined loading flag: consumers shouldn't need to
      // know profile loading is itself gated on auth resolving first.
      loading: authLoading || loading,
      error,
      updateProfile: handleUpdate,
      completeOnboarding: handleCompleteOnboarding,
      updateAvatar: handleUpdateAvatar,
      refetchProfile,
    }),
    [profile, authLoading, loading, error, handleUpdate, handleCompleteOnboarding, handleUpdateAvatar, refetchProfile]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
