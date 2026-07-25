"use client";

import { DemoStoreProvider } from "@/lib/demo/store";
import { AuthProvider } from "@/lib/auth/auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DemoStoreProvider>{children}</DemoStoreProvider>
    </AuthProvider>
  );
}
