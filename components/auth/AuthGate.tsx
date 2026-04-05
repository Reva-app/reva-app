"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAppData } from "@/lib/store";

/**
 * Client-side auth + onboarding guard.
 *
 * - While session is resolving: neutral loading screen (prevents flash).
 * - No session: redirect to /login.
 * - Session but setup not completed: redirect to /instellingen (unless already there).
 * - Session + setup done: render children normally.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { hydrated, setupCompleted } = useAppData();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Wait until both auth and store data are ready
    if (authLoading || !hydrated) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    // Redirect to onboarding if setup not yet done, but avoid redirect loop
    if (!setupCompleted && pathname !== "/instellingen") {
      router.replace("/instellingen");
    }
  }, [authLoading, hydrated, user, setupCompleted, pathname, router]);

  const isLoading = authLoading || !hydrated;

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: "#f8f7f4" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "#e8e5df", borderTopColor: "#e8632a" }}
          />
          <span className="text-sm font-medium" style={{ color: "#a8a29e" }}>
            Laden…
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Hide app content while redirecting to onboarding
  if (!setupCompleted && pathname !== "/instellingen") {
    return null;
  }

  return <>{children}</>;
}
