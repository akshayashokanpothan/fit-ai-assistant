"use client";

import { DemoStoreProvider } from "@/lib/demo/store";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ProfileProvider } from "@/lib/profile/profile-context";
import { WorkoutsProvider } from "@/lib/workouts/workouts-context";
import { MealsProvider } from "@/lib/meals/meals-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProfileProvider>
        <WorkoutsProvider>
          <MealsProvider>
            <DemoStoreProvider>{children}</DemoStoreProvider>
          </MealsProvider>
        </WorkoutsProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}
