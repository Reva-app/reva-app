"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { PatientStatus } from "@/lib/hooks/usePatientStatus";

interface AccountInactiveScreenProps {
  status: Exclude<PatientStatus, "active">;
  onSignOut: () => void;
}

const COPY: Record<Exclude<PatientStatus, "active">, { title: string; body: string }> = {
  archived: {
    title: "Dossier gearchiveerd",
    body: "Je dossier is gearchiveerd door je fysiopraktijk. Neem contact op met je praktijk als je denkt dat dit niet klopt.",
  },
  inactive: {
    title: "Toegang tijdelijk gepauzeerd",
    body: "Je toegang tot dit dossier is momenteel gepauzeerd door je fysiopraktijk. Neem contact op met je praktijk voor meer informatie.",
  },
};

/**
 * Blokkerend scherm zodra patients.status niet 'active' is — zelfde patroon
 * als MfaChallengeScreen/RequiredHerstelModal (app/(app)/instellingen/page.tsx):
 * geen sluitknop, niet weg te klikken. Alleen bereikbaar via AuthGate.
 */
export function AccountInactiveScreen({ status, onSignOut }: AccountInactiveScreenProps) {
  const copy = COPY[status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="relative w-full max-w-md rounded-2xl p-6 sm:p-8 shadow-2xl" style={{ background: "#ffffff" }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: "#fff3ee" }}>
          <Lock size={22} style={{ color: "#e8632a" }} />
        </div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: "#1a1a1a" }}>
          {copy.title}
        </h2>
        <p className="text-sm leading-relaxed mb-6" style={{ color: "#6b6560" }}>
          {copy.body}
        </p>
        <Button variant="secondary" size="sm" onClick={onSignOut}>Uitloggen</Button>
      </div>
    </div>
  );
}
