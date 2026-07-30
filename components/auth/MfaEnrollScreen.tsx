"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabaseClient";

interface MfaEnrollScreenProps {
  onVerified: () => void;
  onSignOut: () => void;
}

/**
 * Blokkerend instelscherm voor tweestapsverificatie — zelfde patroon als
 * RequiredHerstelModal (app/(app)/instellingen/page.tsx): eigen volledige
 * achtergrond, geen sluitknop, niet weg te klikken. Alleen bereikbaar via
 * PortalGate wanneer een organisatielid nog geen geverifieerde factor heeft.
 */
export function MfaEnrollScreen({ onVerified, onSignOut }: MfaEnrollScreenProps) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      // Een eerdere, nooit-afgeronde poging (bv. na een pagina-ververs
      // zonder de code in te vullen) laat een "unverified" factor achter.
      // Supabase staat geen tweede enroll() toe zolang die nog bestaat, dus
      // eerst opruimen — een unverified factor mag zonder aal2 verwijderd
      // worden (die eis geldt alleen voor een al geverifieerde factor).
      const { data: existing } = await supabase.auth.mfa.listFactors();
      // .totp is getypeerd als uitsluitend geverifieerde factoren — .all
      // bevat ook nog-niet-geverifieerde, dus daar op filteren.
      const stale = existing?.all.find((f) => f.factor_type === "totp" && f.status === "unverified");
      if (stale) {
        await supabase.auth.mfa.unenroll({ factorId: stale.id });
      }
      if (cancelled) return;

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp", issuer: "REVA App" });
      if (cancelled) return;
      if (enrollError || !data) {
        console.error("[MfaEnrollScreen] enroll:", enrollError);
        setError("Instellen van tweestapsverificatie is niet gelukt. Probeer de pagina te vernieuwen.");
        setLoading(false);
        return;
      }
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId || code.length !== 6) return;
    setVerifying(true);
    setError("");
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    setVerifying(false);
    if (verifyError) {
      setError("Onjuiste code. Controleer je authenticator-app en probeer het opnieuw.");
      return;
    }
    onVerified();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="relative w-full max-w-md rounded-2xl p-6 sm:p-8 shadow-2xl" style={{ background: "#ffffff" }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: "#fff3ee" }}>
          <ShieldCheck size={22} style={{ color: "#e8632a" }} />
        </div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: "#1a1a1a" }}>
          Tweestapsverificatie instellen
        </h2>
        <p className="text-sm leading-relaxed mb-5" style={{ color: "#6b6560" }}>
          Om toegang te krijgen tot het praktijkportaal moet je tweestapsverificatie instellen. Scan de QR-code met een
          authenticator-app (bijvoorbeeld Google Authenticator of Authy) en vul de 6-cijferige code in.
        </p>

        {loading ? (
          <p className="text-sm" style={{ color: "#9ca3af" }}>Bezig met voorbereiden…</p>
        ) : !factorId ? (
          <>
            {error && <p className="text-xs mb-4" style={{ color: "#dc2626" }}>{error}</p>}
            <Button variant="secondary" size="sm" onClick={onSignOut}>Uitloggen</Button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {qrCode && (
              <div className="flex justify-center p-3 rounded-xl border" style={{ borderColor: "#e8e5df", background: "#faf9f7" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  // qr_code van Supabase blijkt in de praktijk al een
                  // volledige data:-URI te zijn (niet kale SVG-markup zoals
                  // de SDK-documentatie suggereert) — dus rechtstreeks als
                  // src gebruiken, geen voorvoegsel meer toevoegen.
                  src={qrCode}
                  alt="QR-code voor authenticator-app"
                  className="w-40 h-40"
                />
              </div>
            )}
            {secret && (
              <div>
                <p className="text-[11px] text-gray-400 mb-1">
                  Kun je de QR-code niet scannen? Voer deze code handmatig in:
                </p>
                <p className="text-xs font-mono rounded-lg px-3 py-2 select-all" style={{ background: "#f3f0eb", color: "#1a1a1a" }}>
                  {secret}
                </p>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Verificatiecode</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                autoFocus
                className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none tracking-widest text-center"
                style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }}
              />
              {error && <p className="text-[11px] mt-1" style={{ color: "#dc2626" }}>{error}</p>}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" size="sm" disabled={verifying || code.length !== 6}>
                {verifying ? "Bevestigen…" : "Bevestigen"}
              </Button>
              <button type="button" onClick={onSignOut} className="text-xs font-medium hover:opacity-70" style={{ color: "#9ca3af" }}>
                Uitloggen
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
