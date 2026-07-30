"use client";

import { useEffect, useState } from "react";
import { Activity, ClipboardCheck, HeartPulse } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { LineChart, Bar, PeriodFilter, type Period } from "@/components/ui/Charts";
import { formatDate } from "@/lib/data";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import {
  loadOrgUsageStats, loadTherapistWorkload, loadPortalStaffOverview,
  VIEW_ANALYTICS_ROLES, STAFF_INACTIVITY_THRESHOLD_DAYS, isDateStale,
  type PortalOrgUsageStats, type PortalTherapistWorkload, type PortalStaffMember,
} from "@/lib/services/portalService";

export default function PortalAnalysePage() {
  const { checked, membership } = usePortalMembership();
  const [period, setPeriod] = useState<Period>(30);
  const [stats, setStats] = useState<PortalOrgUsageStats | null>(null);
  const [workload, setWorkload] = useState<{ rows: PortalTherapistWorkload[]; unassignedCount: number } | null>(null);
  const [staff, setStaff] = useState<PortalStaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const canView = !!membership && VIEW_ANALYTICS_ROLES.includes(membership.roleKey);

  useEffect(() => {
    if (!checked || !membership || !canView) return;
    let cancelled = false;
    loadOrgUsageStats(membership.organizationId, period).then((data) => {
      if (!cancelled) setStats(data);
    });
    return () => { cancelled = true; };
  }, [checked, membership, canView, period]);

  useEffect(() => {
    if (!checked || !membership || !canView) return;
    let cancelled = false;
    Promise.all([
      loadTherapistWorkload(membership.organizationId),
      loadPortalStaffOverview(membership.organizationId),
    ]).then(([workloadData, staffData]) => {
      if (cancelled) return;
      setWorkload(workloadData);
      setStaff(staffData.filter((m) => m.kind === "member" && m.status === "active"));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [checked, membership, canView]);

  if (checked && membership && !canView) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <SectionHeader title="Analyse" subtitle="Gebruik en activiteit van je praktijk" />
        <p className="text-sm text-gray-400 mt-4">
          Alleen de praktijkeigenaar kan de analysepagina bekijken.
        </p>
      </div>
    );
  }

  const maxWorkload = Math.max(1, ...(workload?.rows.map((r) => r.patientCount) ?? [0]));
  const maxTrendCheckins = Math.max(1, ...(stats?.trend.map((p) => p.checkins) ?? [0]));
  const maxTrendTrainings = Math.max(1, ...(stats?.trend.map((p) => p.trainingsCompleted) ?? [0]));

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <SectionHeader title="Analyse" subtitle="Gebruik en activiteit van je praktijk" />
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Check-ins" value={stats ? stats.totalCheckins : "…"} icon={HeartPulse} />
        <StatCard label="Trainingen afgerond" value={stats ? stats.totalTrainingsCompleted : "…"} icon={Activity} iconColor="#3b82f6" />
        <StatCard
          label="Actieve patiënten"
          value={stats ? stats.activePatientCount : "…"}
          subtitle={stats ? `van de ${stats.totalPatientCount} patiënten` : undefined}
          icon={ClipboardCheck}
          iconColor="#8b5cf6"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Check-ins per dag" />
          {stats && (
            <LineChart
              data={stats.trend.map((p) => p.checkins)}
              dates={stats.trend.map((p) => p.date)}
              color="#e8632a"
              max={maxTrendCheckins}
              height={100}
            />
          )}
        </Card>
        <Card>
          <CardHeader title="Trainingen per dag" />
          {stats && (
            <LineChart
              data={stats.trend.map((p) => p.trainingsCompleted)}
              dates={stats.trend.map((p) => p.date)}
              color="#3b82f6"
              max={maxTrendTrainings}
              height={100}
            />
          )}
        </Card>
      </div>

      <div id="werkdruk">
        <Card>
          <CardHeader title="Werkdruk per behandelaar" subtitle="Aantal actieve patiënten, puur ter info" />
          {loading ? (
            <p className="text-sm text-gray-400">Laden…</p>
          ) : workload && workload.rows.length > 0 ? (
            <div className="space-y-3">
              {workload.rows.map((r) => (
                <Bar
                  key={r.userId}
                  label={r.fullName ?? "Onbekend"}
                  value={r.patientCount}
                  max={maxWorkload}
                  format={(v) => String(v)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Nog geen behandelaars om werkdruk voor te tonen.</p>
          )}
          {workload && workload.unassignedCount > 0 && (
            <p className="text-xs text-gray-400 mt-4">
              {workload.unassignedCount} {workload.unassignedCount === 1 ? "patiënt is" : "patiënten zijn"} nog niet toegewezen aan een behandelaar.
            </p>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Teamactiviteit" subtitle="Laatste keer ingelogd per medewerker" />
        {loading ? (
          <p className="text-sm text-gray-400">Laden…</p>
        ) : staff.length > 0 ? (
          <div className="space-y-2.5">
            {staff.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 py-1.5">
                <span className="text-sm text-gray-700 truncate">{m.fullName ?? m.email ?? "Onbekend"}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400">
                    {m.lastSignInAt ? formatDate(m.lastSignInAt) : "Nog niet ingelogd"}
                  </span>
                  {isDateStale(m.lastSignInAt, STAFF_INACTIVITY_THRESHOLD_DAYS) && (
                    <Badge variant="warning">Niet recent ingelogd</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Nog geen medewerkers.</p>
        )}
      </Card>
    </div>
  );
}
