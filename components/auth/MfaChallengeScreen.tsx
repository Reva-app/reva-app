"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { OtpCodeInput } from "@/components/ui/OtpCodeInput";
import { createClient } from "@/lib/supabaseClient";

interface MfaChallengeScreenProps {
  factorId: string;
  onVerified: () => void;
  onSignOut: () => void;
}

/**
 * Blokkerend verificatiescherm — voor een gebruiker die al een geverifieerde
 * factor heeft, maar deze sessie nog geen code heeft ingevuld. Zelfde
 * blokkerende schil als MfaEnrollScreen, alleen zonder QR-stap.
 */
export function MfaChallengeScreen({ factorId, onVerified, onSignOut }: MfaChallengeScreenProps) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  async function verify(value: string) {
    if (value.length !== 6 || verifying) return;
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

  return (
    <div className="fixed inset-0 z-(--z-gate) flex items-center justify-center p-4 overflow-y-auto" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="relative w-full max-w-[420px] my-auto rounded-3xl px-6 py-8 sm:px-9 sm:py-10 shadow-2xl" style={{ background: "#ffffff" }}>
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--brand-accent-soft, #fff3ee)" }}>
            <ShieldCheck size={22} style={{ color: "var(--brand-accent, #e8632a)" }} />
          </div>
          <h2 className="text-xl font-semibold tracking-tight mb-2" style={{ color: "#1a1a1a" }}>
            Voer je verificatiecode in
          </h2>
          <p className="text-sm leading-relaxed max-w-[320px]" style={{ color: "#6b6560" }}>
            Open je authenticator-app en vul de 6-cijferige code voor REVA App in.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void verify(code);
          }}
          className="mt-7"
        >
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

          <Button type="submit" size="lg" fullWidth className="mt-5 rounded-xl" disabled={verifying || code.length !== 6}>
            {verifying ? "Controleren…" : "Ga door"}
          </Button>

          <div className="mt-5 flex justify-center">
            <button type="button" onClick={onSignOut} className="text-xs font-medium hover:opacity-70" style={{ color: "#6b7280" }}>
              Uitloggen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
