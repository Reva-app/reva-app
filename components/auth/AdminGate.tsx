"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePlatformAdmin } from "@/lib/hooks/usePlatformAdmin";
import { Button } from "@/components/ui/Button";

/**
 * Toegangscontrole voor het Super Admin Portal.
 *
 * - Geen sessie: redirect naar /login.
 * - Sessie, maar geen platform admin: nette "geen toegang"-melding (geen
 *   redirect — dit account kan legitiem een gewone patiënt zijn).
 * - Platform admin: render children.
 *
 * Dit is een UX-laag; de echte grens is RLS (is_platform_admin() op elke
 * tabel-policy) — zie docs/REVA-V2-MASTERPLAN.md §16.1.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, signOut } = useAuth();
  const { checked, isAdmin } = usePlatformAdmin();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [authLoading, user, router]);

  if (authLoading || !checked) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: "#f8f7f4" }}
      >
        <p className="text-sm" style={{ color: "#9ca3af" }}>
          Laden…
        </p>
      </div>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div
        className="flex h-screen items-center justify-center px-6"
        style={{ background: "#f8f7f4" }}
      >
        <div className="text-center max-w-sm">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 mx-auto"
            style={{ background: "#fef2f2" }}
          >
            <ShieldAlert size={22} style={{ color: "#ef4444" }} />
          </div>
          <p className="text-sm font-medium text-gray-800">Geen toegang</p>
          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
            Dit gedeelte is alleen toegankelijk voor platformbeheerders. Ben
            je van mening dat dit niet klopt, neem dan contact op met REVA.
          </p>
          <div className="flex items-center justify-center gap-2 mt-5">
            <Button variant="secondary" size="sm" onClick={() => router.push("/")}>
              Naar patiëntenapp
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Uitloggen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
