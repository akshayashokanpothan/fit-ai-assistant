"use client";

import { PaceMark } from "@/components/brand-mark";
import { useAuth } from "@/lib/auth/auth-context";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-paper px-6 pb-8 pt-10">
      <div className="flex items-center gap-2">
        <PaceMark size={24} />
        <span className="font-display text-[15px] font-medium text-ink">Pace AI</span>
      </div>

      {user && (
        <div className="mt-4 flex items-center justify-between rounded-[var(--radius-md)] border border-line bg-surface px-3.5 py-2.5 text-xs">
          <span className="text-ink-soft">
            Signed in as <span className="font-medium text-ink">{user.email}</span>
          </span>
          <button onClick={() => signOut()} className="font-medium text-primary">
            Sign out
          </button>
        </div>
      )}

      <div className="flex-1 pt-10">{children}</div>
    </div>
  );
}
