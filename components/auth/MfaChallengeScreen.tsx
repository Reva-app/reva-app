"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;
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
          Verificatiecode vereist
        </h2>
        <p className="text-sm leading-relaxed mb-5" style={{ color: "#6b6560" }}>
          Vul de 6-cijferige code uit je authenticator-app in om verder te gaan.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
      </div>
    </div>
  );
}
