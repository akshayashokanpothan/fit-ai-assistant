"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TriangleAlert } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const callbackError = searchParams.get("error");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    router.replace("/");
  }

  return (
    <div>
      <h1 className="font-display text-[28px] font-medium leading-tight text-ink">
        Welcome back
      </h1>
      <p className="mt-1.5 text-sm text-ink-soft">Sign in to continue with Pace AI.</p>

      {callbackError && (
        <div className="mt-5 flex items-start gap-2 rounded-[var(--radius-md)] border border-danger-soft bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>That verification link didn&apos;t work. Please try signing in, or sign up again.</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-soft">Email</span>
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-soft">Password</span>
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        New to Pace AI?{" "}
        <Link href="/signup" className="font-medium text-primary">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
