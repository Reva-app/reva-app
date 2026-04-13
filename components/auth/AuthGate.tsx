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

  // Normaliseer het pad: verwijder trailing slash (trailingSlash: true in
  // static export geeft `/instellingen/` terug, vergelijking met `/instellingen`
  // zou anders altijd mislukken en een oneindige redirect-loop veroorzaken).
  const normalizedPath = pathname.replace(/\/$/, "") || "/";
  const onInstellingen = normalizedPath === "/instellingen";

  useEffect(() => {
    if (authLoading || !hydrated) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!setupCompleted && !onInstellingen) {
      router.replace("/instellingen");
    }
  }, [authLoading, hydrated, user, setupCompleted, onInstellingen, router]);

  if (authLoading || !hydrated) return null;
  if (!user) return null;
  if (!setupCompleted && !onInstellingen) return null;

  return <>{children}</>;
}
