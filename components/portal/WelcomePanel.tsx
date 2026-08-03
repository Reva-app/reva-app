"use client";

import { useEffect, useState } from "react";
import { X, Check, MapPin, Palette, Users, HeartPulse } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OnboardingItemGrid } from "@/components/ui/OnboardingItemGrid";
import { OnboardingProgressPill } from "@/components/ui/OnboardingProgressPill";
import { loadPortalBranding, markMembershipWelcomed, BRANDING_SETTINGS_ENABLED, type PortalDashboardStats } from "@/lib/services/portalService";

const USPS = [
  "Nodig je hele team uit en regel rollen en rechten in een paar klikken.",
  "Beheer al je locaties overzichtelijk op één plek.",
  "Patiënten krijgen een eigen dashboard voor afspraken, oefeningen en voortgang.",
  ...(BRANDING_SETTINGS_ENABLED ? ["Alles in jouw eigen huisstijl — logo en kleur naar keuze."] : []),
];

interface WelcomePanelProps {
  membershipId: string;
  organizationId: string;
  organizationName: string;
  stats: PortalDashboardStats;
  /** true zodra memberships.welcomed_at al eerder gezet is — start dan ingeklapt i.p.v. de volledige kaart te forceren. */
  initiallyWelcomed: boolean;
}

export function WelcomePanel({ membershipId, organizationId, organizationName, stats, initiallyWelcomed }: WelcomePanelProps) {
  const [brandingSet, setBrandingSet] = useState<boolean | null>(null);
  const [collapsed, setCollapsed] = useState(initiallyWelcomed);
  const [sessionExpanded, setSessionExpanded] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadPortalBranding(organizationId).then((branding) => {
      if (cancelled) return;
      setBrandingSet(!!branding?.primaryColor);
    });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  async function handleCollapse() {
    setDismissing(true);
    setCollapsed(true);
    setSessionExpanded(false);
    await markMembershipWelcomed(membershipId);
    setDismissing(false);
  }

  const checklist = [
    { label: "Voeg een locatie toe", done: stats.locationCount > 0, href: "/portal/locaties", icon: MapPin },
    ...(BRANDING_SETTINGS_ENABLED
      ? [{ label: "Stel je huisstijl in", done: brandingSet === true, href: "/portal/huisstijl", icon: Palette }]
      : []),
    { label: "Nodig een collega uit", done: stats.colleagueCount > 1, href: "/portal/medewerkers", icon: Users },
    { label: "Voeg je eerste patiënt toe", done: stats.patientCount > 0, href: "/portal/patienten", icon: HeartPulse },
  ];

  // Nog niet bekend (huisstijl-check nog bezig) → nog niet als "compleet" beoordelen.
  const allDone = brandingSet !== null && checklist.every((item) => item.done);

  if (allDone) return null;

  if (collapsed && !sessionExpanded) {
    return (
      <OnboardingProgressPill
        label={`Welkom bij REVA, ${organizationName}!`}
        doneCount={checklist.filter((item) => item.done).length}
        totalCount={checklist.length}
        onClick={() => setSessionExpanded(true)}
      />
    );
  }

  return (
    <Card className="relative">
      <button
        type="button"
        onClick={handleCollapse}
        disabled={dismissing}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Inklappen"
      >
        <X size={16} />
      </button>

      <div className="max-w-xl pr-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Welkom bij REVA, {organizationName}!</h2>
        <p className="text-sm text-gray-500 mb-4">
          Dit is jouw eigen omgeving om het hersteltraject van al je patiënten overzichtelijk te beheren — van eerste consult tot volledig herstel.
        </p>
        <ul className="space-y-1.5 mb-6">
          {USPS.map((usp) => (
            <li key={usp} className="flex items-start gap-2 text-sm text-gray-600">
              <Check size={14} className="mt-0.5 shrink-0" style={{ color: "var(--brand-accent, #e8632a)" }} />
              {usp}
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-5">
        <OnboardingItemGrid items={checklist} columns={2} />
      </div>

      <Button size="sm" variant="secondary" onClick={handleCollapse} disabled={dismissing}>
        Aan de slag
      </Button>
    </Card>
  );
}
