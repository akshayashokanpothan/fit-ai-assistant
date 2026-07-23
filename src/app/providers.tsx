"use client";

import { DemoStoreProvider } from "@/lib/demo/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return <DemoStoreProvider>{children}</DemoStoreProvider>;
}
