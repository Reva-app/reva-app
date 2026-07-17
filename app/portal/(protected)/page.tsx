"use client";

import { useEffect, useState } from "react";
import { HeartPulse, Users } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { loadPortalDashboardStats, type PortalDashboardStats } from "@/lib/services/portalService";

export default function PortalDashboardPage() {
  const { checked, membership } = usePortalMembership();
  const [stats, setStats] = useState<PortalDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!checked || !membership) return;
    let cancelled = false;
    loadPortalDashboardStats(membership.organizationId).then((data) => {
      if (cancelled) return;
      setStats(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [checked, membership]);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-8">
      <SectionHeader
        title={membership ? membership.organizationName : "Dashboard"}
        subtitle={membership ? `Welkom terug — ${membership.roleName}` : undefined}
      />

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Patiënten" value={loading ? "…" : stats?.patientCount ?? 0} icon={HeartPulse} />
        <StatCard label="Collega's" value={loading ? "…" : stats?.colleagueCount ?? 0} icon={Users} iconColor="#8b5cf6" />
      </div>

      <p className="text-sm text-gray-400 max-w-md">
        Dit is de eerste versie van de Practice Portal. Meer functionaliteit
        (agenda, protocollen, berichten) volgt in latere fases.
      </p>
    </div>
  );
}
