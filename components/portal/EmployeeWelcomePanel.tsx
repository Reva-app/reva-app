"use client";

import { useEffect, useState } from "react";
import { X, Clock, UserCircle, HeartPulse } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OnboardingItemGrid } from "@/components/ui/OnboardingItemGrid";
import { OnboardingProgressPill } from "@/components/ui/OnboardingProgressPill";
import { loadEmployeeOnboardingStatus, markMembershipWelcomed, type PortalDashboardStats } from "@/lib/services/portalService";

interface EmployeeWelcomePanelProps {
  membershipId: string;
  userId: string;
  organizationName: string;
  roleName: string;
  stats: PortalDashboardStats;
  /** true zodra memberships.welcomed_at al eerder gezet is — start dan ingeklapt i.p.v. de volledige kaart te forceren. */
  initiallyWelcomed: boolean;
}

/**
 * Rolgebonden variant van WelcomePanel voor medewerkers (elke rol behalve
 * organization_owner) — bewust géén "locatie aanmaken"-stap, want alleen de
 * eigenaar heeft daar rechten toe (zie can_manage_org_branding/locations RLS).
 */
export function EmployeeWelcomePanel({ membershipId, userId, organizationName, roleName, stats, initiallyWelcomed }: EmployeeWelcomePanelProps) {
  const [status, setStatus] = useState<{ hasWorkSchedule: boolean; hasAvatar: boolean } | null>(null);
  const [collapsed, setCollapsed] = useState(initiallyWelcomed);
  const [sessionExpanded, setSessionExpanded] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadEmployeeOnboardingStatus(membershipId, userId).then((s) => {
      if (cancelled) return;
      setStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, [membershipId, userId]);

  async function handleCollapse() {
    setDismissing(true);
    setCollapsed(true);
    setSessionExpanded(false);
    await markMembershipWelcomed(membershipId);
    setDismissing(false);
  }

  const checklist = [
    { label: "Vul je werkuren in", done: status?.hasWorkSchedule === true, href: "/portal/account?tab=werkuren", icon: Clock },
    { label: "Personaliseer je account", done: status?.hasAvatar === true, href: "/portal/account?tab=account", icon: UserCircle },
    { label: "Bekijk je eerste patiënt", done: stats.patientCount > 0, href: "/portal/patienten", icon: HeartPulse },
  ];

  // Nog niet bekend (status nog aan het laden) → nog niet als "compleet" beoordelen.
  const allDone = status !== null && checklist.every((item) => item.done);

  if (allDone) return null;

  if (collapsed && !sessionExpanded) {
    return (
      <OnboardingProgressPill
        label={`Welkom bij ${organizationName}!`}
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

      <div className="max-w-xl pr-6 mb-5">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Welkom bij {organizationName}!</h2>
        <p className="text-sm text-gray-500">
          Je bent toegevoegd als {roleName}. Doorloop deze paar stappen om je account klaar te zetten.
        </p>
      </div>

      <div className="mb-5">
        <OnboardingItemGrid items={checklist} columns={3} />
      </div>

      <Button size="sm" variant="secondary" onClick={handleCollapse} disabled={dismissing}>
        Aan de slag
      </Button>
    </Card>
  );
}
