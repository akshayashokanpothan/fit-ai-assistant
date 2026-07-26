"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

interface AuthResult {
  error: string | null;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Auth session provider. Deliberately independent from `DemoStoreProvider`
 * (`src/lib/demo/store.tsx`) and from `ProfileProvider`
 * (`src/lib/profile/profile-context.tsx`), which consumes `useAuth()` but
 * does not feed state back into this provider — this file owns Supabase
 * session/auth state only, nothing about `public.profiles`.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signUp = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      // Prefer the pinned canonical site URL so the confirmation email
      // always points at the stable production domain, not whatever
      // ephemeral Vercel preview/deployment origin the signup happened to
      // be triggered from. Falls back to the current origin for local dev,
      // where window.location.origin (localhost) is already stable.
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      // Targets /auth/confirm (token_hash + verifyOtp) — the production
      // flow, paired with a custom "Confirm signup" email template sent via
      // Resend custom SMTP. /auth/callback is reserved for future
      // OAuth/PKCE providers (Google, Apple, etc.), not email confirmation.
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${siteUrl}/auth/confirm`,
        },
      });
      return { error: error?.message ?? null };
    },
    [supabase]
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signUp, signIn, signOut }),
    [user, loading, signUp, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
