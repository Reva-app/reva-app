"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAppData } from "@/lib/store";

/**
 * Client-side auth + onboarding guard.
 *
 * - No session: redirect to /login.
 * - Session but setup not completed: redirect to /instellingen (unless already there).
 * - Session + setup done: render children normally.
 *
 * Het laadscherm wordt afgehandeld door AppLoadingGate (hoger in de boom).
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { hydrated, setupCompleted } = useAppData();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (authLoading || !hydrated) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!setupCompleted && pathname !== "/instellingen") {
      router.replace("/instellingen");
    }
  }, [authLoading, hydrated, user, setupCompleted, pathname, router]);

  if (authLoading || !hydrated) return null;
  if (!user) return null;
  if (!setupCompleted && pathname !== "/instellingen") return null;

  return <>{children}</>;
}
