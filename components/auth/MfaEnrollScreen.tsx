"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ShieldCheck } from "lucide-react";
import { OtpCodeInput } from "@/components/ui/OtpCodeInput";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabaseClient";

interface MfaEnrollScreenProps {
  onVerified: () => void;
  onSignOut: () => void;
  /** Lopende-tekstnaam van het portaal, bv. "het beheerportaal". */
  portalLabel?: string;
}

/**
 * Blokkerend instelscherm voor tweestapsverificatie — zelfde patroon als
 * RequiredHerstelModal (app/(app)/instellingen/page.tsx): eigen volledige
 * achtergrond, geen sluitknop, niet weg te klikken. Bereikbaar via
 * PortalGate (organisatielid) en AdminGate (platform-beheerder) wanneer er
 * nog geen geverifieerde factor is.
 */
export function MfaEnrollScreen({ onVerified, onSignOut, portalLabel = "het praktijkportaal" }: MfaEnrollScreenProps) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

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

  async function verify(value: string) {
    if (!factorId || value.length !== 6 || verifying) return;
    setVerifying(true);
    setError("");
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: value });
    setVerifying(false);
    if (verifyError) {
      setError("Onjuiste code. Controleer je authenticator-app en probeer het opnieuw.");
      setCode("");
      return;
    }
    onVerified();
  }

  async function copySecret() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Klembord geblokkeerd — de code is ook handmatig selecteerbaar.
    }
  }

  // Geheime sleutel in blokjes van 4 — makkelijker over te typen.
  const secretGrouped = secret.match(/.{1,4}/g)?.join(" ") ?? secret;

  return (
    <div className="fixed inset-0 z-(--z-gate) flex items-center justify-center p-4 overflow-y-auto" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="relative w-full max-w-[420px] my-auto rounded-3xl px-6 py-8 sm:px-9 sm:py-10 shadow-2xl" style={{ background: "#ffffff" }}>
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: "#fff3ee" }}>
            <ShieldCheck size={22} style={{ color: "#e8632a" }} />
          </div>
          <h2 className="text-xl font-semibold tracking-tight mb-2" style={{ color: "#1a1a1a" }}>
            Scan de code in je authenticator-app
          </h2>
          <p className="text-sm leading-relaxed max-w-[320px]" style={{ color: "#6b6560" }}>
            Tweestapsverificatie is verplicht voor {portalLabel}. Scan de QR-code met bijvoorbeeld Google
            Authenticator, Microsoft Authenticator of Authy en vul de code in.
          </p>
        </div>

        {loading ? (
          <div className="mt-7 flex flex-col items-center gap-6" aria-busy="true">
            <div className="w-[184px] h-[184px] rounded-2xl animate-pulse" style={{ background: "#f3f0eb" }} />
            <p className="text-sm" style={{ color: "#6b7280" }}>Bezig met voorbereiden…</p>
          </div>
        ) : !factorId ? (
          <div className="mt-7 flex flex-col items-center gap-4">
            {error && <p className="text-sm text-center" style={{ color: "#dc2626" }}>{error}</p>}
            <Button variant="secondary" size="sm" onClick={onSignOut}>Uitloggen</Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void verify(code);
            }}
            className="mt-7"
          >
            {showSecret ? (
              <div className="rounded-2xl border p-4" style={{ borderColor: "#e8e5df", background: "#faf9f7" }}>
                <p className="text-xs leading-relaxed mb-3" style={{ color: "#6b6560" }}>
                  Kies in je app voor <span className="font-medium" style={{ color: "#1a1a1a" }}>handmatig invoeren</span>{" "}
                  en voer deze sleutel in. Kies &lsquo;tijdgebaseerd&rsquo; als je app daarom vraagt.
                </p>
                <div className="flex items-center gap-2">
                  <p className="flex-1 min-w-0 break-all text-sm font-mono tracking-wide rounded-xl px-3 py-2.5 select-all" style={{ background: "#ffffff", color: "#1a1a1a", border: "1px solid #e8e5df" }}>
                    {secretGrouped}
                  </p>
                  <button
                    type="button"
                    onClick={copySecret}
                    aria-label={copied ? "Gekopieerd" : "Sleutel kopiëren"}
                    className="shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center transition-colors hover:bg-gray-50"
                    style={{ borderColor: "#e8e5df", background: "#ffffff" }}
                  >
                    {copied ? <Check size={16} style={{ color: "#16a34a" }} /> : <Copy size={16} style={{ color: "#6b6560" }} />}
                  </button>
                </div>
              </div>
            ) : (
              qrCode && (
                <div className="flex justify-center">
                  <div className="rounded-2xl border p-3 bg-white" style={{ borderColor: "#e8e5df", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      // qr_code van Supabase is in de praktijk al een volledige
                      // data:-URI — rechtstreeks als src gebruiken.
                      src={qrCode}
                      alt="QR-code voor je authenticator-app"
                      width={160}
                      height={160}
                      className="block w-40 h-40"
                      style={{ imageRendering: "pixelated" }}
                    />
                  </div>
                </div>
              )
            )}

            <div className="mt-7">
              <p className="text-sm font-medium mb-2.5" style={{ color: "#1a1a1a" }}>Eenmalige code</p>
              <OtpCodeInput
                value={code}
                onChange={(v) => {
                  setCode(v);
                  if (error) setError("");
                }}
                onComplete={(v) => void verify(v)}
                disabled={verifying}
                error={!!error}
                autoFocus
              />
              <p className="text-xs text-center mt-2.5 min-h-4" role={error ? "alert" : undefined} style={{ color: error ? "#dc2626" : "#9ca3af" }}>
                {error || "De code ververst elke 30 seconden."}
              </p>
            </div>

            <Button type="submit" size="lg" fullWidth className="mt-5 rounded-xl" disabled={verifying || code.length !== 6}>
              {verifying ? "Controleren…" : "Ga door"}
            </Button>

            <div className="mt-5 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="text-sm font-medium hover:opacity-70 transition-opacity"
                style={{ color: "#e8632a" }}
              >
                {showSecret ? "Toch de QR-code scannen" : "Lukt het niet om de code te scannen?"}
              </button>
              <button type="button" onClick={onSignOut} className="text-xs font-medium hover:opacity-70" style={{ color: "#6b7280" }}>
                Uitloggen
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
