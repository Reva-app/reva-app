"use client";

import { useState } from "react";
import { Clock, AlertTriangle, X } from "lucide-react";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { trialState, dayLabel } from "@/lib/trial";

/**
 * Balk bovenin de portal tijdens de proefperiode (migratie 129).
 * - Proefperiode loopt: rustige balk, alleen voor de Practice Owner. Op
 *   telefoon één korte regel, en per sessie weg te klikken.
 * - Speltijd na de einddatum: rode balk voor alle medewerkers, want die
 *   verliezen binnenkort de toegang.
 */
const DISMISS_KEY = "reva-trial-banner-dismissed";

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function TrialBanner() {
  const { membership } = usePortalMembership();
  // Alleen client-side gerenderd (achter PortalGate), dus sessionStorage is hier veilig.
  const [dismissed, setDismissed] = useState(readDismissed);
  if (!membership) return null;

  const state = trialState(membership.organizationStatus, membership.trialEndsAt);
  const isOwner = membership.roleKey === "organization_owner";

  if (state.kind === "trial" && isOwner) {
    if (dismissed) return null;
    const text = state.daysLeft === 0
      ? "Vandaag is de laatste dag van je proefperiode."
      : `Je proefperiode loopt nog ${dayLabel(state.daysLeft)}.`;
    const shortText = state.daysLeft === 0 ? "Laatste dag proefperiode." : `Proefperiode: nog ${dayLabel(state.daysLeft)}.`;
    return (
      <div className="flex items-center gap-2 pl-4 sm:pl-6 pr-1 sm:pr-3 py-1 text-xs" style={{ background: "#fff7ed", color: "#9a3412", borderBottom: "1px solid #fed7aa" }}>
        <Clock size={14} className="shrink-0" />
        <span className="flex-1 min-w-0 py-1.5">
          <span className="sm:hidden">{shortText} </span>
          <span className="hidden sm:inline">{text} Wil je daarna doorgaan? </span>
          <a href="mailto:info@reva-app.nl" className="font-semibold underline underline-offset-2 whitespace-nowrap">
            <span className="sm:hidden">Doorgaan?</span>
            <span className="hidden sm:inline">Mail naar info@reva-app.nl</span>
          </a>
        </span>
        <button
          type="button"
          aria-label="Melding verbergen"
          onClick={() => {
            setDismissed(true);
            try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* privémodus: alleen voor nu verbergen */ }
          }}
          className="relative tap-target shrink-0 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/5"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  if (state.kind === "grace") {
    const text = state.graceDaysLeft === 0
      ? "Vandaag is de laatste dag dat je de portal kunt gebruiken."
      : `Je kunt de portal nog ${dayLabel(state.graceDaysLeft + 1)} gebruiken, vandaag meegerekend.`;
    return (
      <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 text-xs font-medium" style={{ background: "#fef2f2", color: "#b91c1c", borderBottom: "1px solid #fecaca" }}>
        <AlertTriangle size={14} className="shrink-0" />
        <span>De proefperiode is afgelopen. {text} Neem contact op via info@reva-app.nl om door te gaan.</span>
      </div>
    );
  }

  return null;
}
