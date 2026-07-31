"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HeartPulse, Users, AlertTriangle, ChevronRight } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { WelcomePanel } from "@/components/portal/WelcomePanel";
import { EmployeeWelcomePanel } from "@/components/portal/EmployeeWelcomePanel";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  loadPortalDashboardStats, loadMyPortalPatientsSummary, loadTherapistWorkload, loadOrgActivitySummary,
  ATTENTION_REASON_LABELS,
  type PortalDashboardStats, type PortalMyPatientsSummary, type PortalTherapistWorkload,
  type PortalOrgActivitySummary, type PatientAttentionReason,
} from "@/lib/services/portalService";

const ATTENTION_BADGE_VARIANT: Record<PatientAttentionReason, "danger" | "warning" | "purple" | "muted"> = {
  hoge_pijnscore: "danger",
  zwelling: "warning",
  lage_dagscore: "purple",
  inactief: "muted",
};

export default function PortalDashboardPage() {
  const { checked, membership } = usePortalMembership();
  const { user } = useAuth();
  const [stats, setStats] = useState<PortalDashboardStats | null>(null);
  const [myPatients, setMyPatients] = useState<PortalMyPatientsSummary | null>(null);
  const [workload, setWorkload] = useState<{ rows: PortalTherapistWorkload[]; unassignedCount: number } | null>(null);
  const [activity, setActivity] = useState<PortalOrgActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  const isOwner = membership?.roleKey === "organization_owner";

  useEffect(() => {
    if (!checked || !membership || !user) return;
    let cancelled = false;
    Promise.all([
      loadPortalDashboardStats(membership.organizationId),
      loadMyPortalPatientsSummary(membership.organizationId, user.id),
      membership.roleKey === "organization_owner"
        ? Promise.all([loadTherapistWorkload(membership.organizationId), loadOrgActivitySummary(membership.organizationId)])
        : Promise.resolve(null),
    ]).then(([statsData, myPatientsData, ownerData]) => {
      if (cancelled) return;
      setStats(statsData);
      setMyPatients(myPatientsData);
      if (ownerData) {
        setWorkload(ownerData[0]);
        setActivity(ownerData[1]);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [checked, membership, user]);

  const showWelcome = !!membership && !welcomeDismissed && !membership.welcomedAt;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-8">
      <SectionHeader
        title={membership ? membership.organizationName : "Dashboard"}
        subtitle={membership ? `Welkom terug, ${membership.roleName}` : undefined}
      />

      {showWelcome && stats && (
        isOwner ? (
          <WelcomePanel
            membershipId={membership.membershipId}
            organizationId={membership.organizationId}
            organizationName={membership.organizationName}
            stats={stats}
            onDismiss={() => setWelcomeDismissed(true)}
          />
        ) : user && (
          <EmployeeWelcomePanel
            membershipId={membership.membershipId}
            userId={user.id}
            organizationName={membership.organizationName}
            roleName={membership.roleName}
            stats={stats}
            onDismiss={() => setWelcomeDismissed(true)}
          />
        )
      )}

      <div className="space-y-4">
        <Card>
          <CardHeader title="Mijn patiënten" subtitle="Patiënten toegewezen aan jou" />
          {loading ? (
            <p className="text-sm text-gray-400">Laden…</p>
          ) : !myPatients || myPatients.totalCount === 0 ? (
            <p className="text-sm text-gray-400">Je hebt momenteel geen patiënten toegewezen.</p>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Mijn patiënten" value={myPatients.totalCount} icon={HeartPulse} />
                <StatCard
                  label="Aandacht nodig"
                  value={myPatients.needsAttentionCount}
                  subtitle="Hoge pijnscore, zwelling of weinig activiteit"
                  icon={AlertTriangle}
                  iconColor="#f59e0b"
                />
                <StatCard label="Check-ins deze week" value={myPatients.checkinsThisWeekCount} icon={HeartPulse} iconColor="#16a34a" />
              </div>
              <div className="space-y-1">
                {myPatients.patients.slice(0, 8).map((p) => (
                  <Link
                    key={p.id}
                    href={`/portal/patienten/${p.id}`}
                    className="flex items-center justify-between gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-gray-700 truncate">{p.fullName || "Nog niet ingevuld"}</span>
                    {p.attentionReasons.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                        {p.attentionReasons.map((reason) => (
                          <Badge key={reason} variant={ATTENTION_BADGE_VARIANT[reason]}>
                            {reason === "inactief" && !p.lastCheckinDate ? "Nog geen activiteit" : ATTENTION_REASON_LABELS[reason]}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
              {myPatients.totalCount > 8 && (
                <Link
                  href={`/portal/patienten?therapist=${user?.id ?? ""}`}
                  className="flex items-center gap-1 text-sm font-medium"
                  style={{ color: "var(--brand-accent, #e8632a)" }}
                >
                  Bekijk alle {myPatients.totalCount} patiënten <ChevronRight size={14} />
                </Link>
              )}
            </div>
          )}
        </Card>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">Organisatie</p>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Patiënten" value={loading ? "…" : stats?.patientCount ?? 0} icon={HeartPulse} />
            <StatCard label="Collega's" value={loading ? "…" : stats?.colleagueCount ?? 0} icon={Users} iconColor="#8b5cf6" />
          </div>
        </div>

        {isOwner && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Werkdruk" subtitle="Patiënten per behandelaar" />
              {workload && workload.rows.length > 0 ? (
                <div className="space-y-2">
                  {workload.rows.slice(0, 3).map((r) => (
                    <div key={r.userId} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 truncate">{r.fullName ?? "Onbekend"}</span>
                      <span className="font-semibold text-gray-800">{r.patientCount}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Nog geen behandelaars.</p>
              )}
              <Link
                href="/portal/analyse#werkdruk"
                className="flex items-center gap-1 text-sm font-medium mt-4"
                style={{ color: "var(--brand-accent, #e8632a)" }}
              >
                Volledig overzicht <ChevronRight size={14} />
              </Link>
            </Card>

            <Card>
              <CardHeader title="Activiteit" subtitle="Gebruik binnen je praktijk" />
              <div className="space-y-2">
                <Link href="/portal/patienten?checkin=older" className="block text-sm text-gray-700 hover:text-gray-900">
                  {activity ? activity.inactivePatientCount : "…"} patiënten zonder recente activiteit
                </Link>
                <Link href="/portal/medewerkers" className="block text-sm text-gray-700 hover:text-gray-900">
                  {activity ? activity.inactiveStaffCount : "…"} medewerkers niet recent ingelogd
                </Link>
              </div>
              <Link
                href="/portal/analyse"
                className="flex items-center gap-1 text-sm font-medium mt-4"
                style={{ color: "var(--brand-accent, #e8632a)" }}
              >
                Bekijk analyse <ChevronRight size={14} />
              </Link>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
