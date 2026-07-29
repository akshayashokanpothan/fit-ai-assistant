"use client";

import { DemoStoreProvider } from "@/lib/demo/store";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ProfileProvider } from "@/lib/profile/profile-context";
import { WorkoutsProvider } from "@/lib/workouts/workouts-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProfileProvider>
        <WorkoutsProvider>
          <DemoStoreProvider>{children}</DemoStoreProvider>
        </WorkoutsProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}
