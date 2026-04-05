"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

/**
 * Client-side auth guard.
 *
 * Shows a neutral loading screen while the session is being resolved, then
 * redirects to /login if no session is found.  This is the second line of
 * defence — the proxy.ts handles the server-side redirect, but this component
 * covers client-side navigation and edge cases where the proxy cannot act.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
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
    // Redirect is in progress — render nothing to avoid a flash of app content
    return null;
  }

  return <>{children}</>;
}
