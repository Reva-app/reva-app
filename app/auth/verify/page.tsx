"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Verifieert een uitnodigings-/magic-linktoken zelf, client-side, in plaats
 * van te vertrouwen op Supabase's eigen /auth/v1/verify-redirect.
 *
 * Reden: mailproviders (Gmail, Outlook, bedrijfs-mailgateways) scannen links
 * in e-mails automatisch door ze zelf al op te vragen — dat "verbruikt" een
 * eenmalig te gebruiken token vóórdat de ontvanger er zelf op klikt, waarna
 * de echte klik altijd faalt. Supabase's eigen advies hiertegen: de link in
 * de mail niet naar hun auto-verifiërende endpoint laten wijzen, maar naar
 * een eigen pagina die de token pas via JavaScript inwisselt — een scanner
 * haalt de pagina wel op, maar voert geen JS uit, dus verbruikt de token niet.
 */
export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyHandler />
    </Suspense>
  );
}

function VerifyHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");
    const type = (searchParams.get("type") as EmailOtpType) || "invite";
    const next = searchParams.get("next") || "/";

    if (!tokenHash) {
      setError("Deze link is ongeldig.");
      return;
    }

    const supabase = createClient();
    supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error }) => {
      if (error) {
        setError("Deze link is niet meer geldig. Vraag een nieuwe uitnodiging aan.");
        return;
      }
      router.replace(next);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10" style={{ background: "#f8f7f4" }}>
      <div className="inline-flex items-center gap-2 mb-8">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "#e8632a" }}
        >
          <span className="text-white font-bold text-sm">R</span>
        </div>
        <span className="font-bold text-lg" style={{ color: "#1a1a1a" }}>REVA</span>
      </div>

      {error ? (
        <div
          className="w-full max-w-sm rounded-2xl p-6 sm:p-8 text-center"
          style={{ background: "#ffffff", border: "1px solid #ece9e3", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "#fff5f5" }}
          >
            <AlertCircle size={22} style={{ color: "#dc2626" }} />
          </div>
          <h2 className="text-base font-semibold text-gray-900 mb-1.5">Link niet geldig</h2>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 size={22} className="animate-spin" />
          <p className="text-sm">Bezig met inloggen…</p>
        </div>
      )}
    </div>
  );
}
