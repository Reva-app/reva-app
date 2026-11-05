"use client";

import { Clock, AlertTriangle } from "lucide-react";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { trialState, dayLabel } from "@/lib/trial";

/**
 * Balk bovenin de portal tijdens de proefperiode (migratie 129).
 * - Proefperiode loopt: rustige balk, alleen voor de Practice Owner.
 * - Speltijd na de einddatum: rode balk voor alle medewerkers, want die
 *   verliezen binnenkort de toegang.
 */
export function TrialBanner() {
  const { membership } = usePortalMembership();
  if (!membership) return null;

  const state = trialState(membership.organizationStatus, membership.trialEndsAt);
  const isOwner = membership.roleKey === "organization_owner";

  if (state.kind === "trial" && isOwner) {
    const text = state.daysLeft === 0
      ? "Vandaag is de laatste dag van je proefperiode."
      : `Je proefperiode loopt nog ${dayLabel(state.daysLeft)}.`;
    return (
      <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 text-xs" style={{ background: "#fff7ed", color: "#9a3412", borderBottom: "1px solid #fed7aa" }}>
        <Clock size={14} className="shrink-0" />
        <span>{text} Wil je daarna doorgaan? Mail naar info@reva-app.nl.</span>
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
