"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HeartPulse, Users, AlertTriangle, ChevronRight } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatStrip } from "@/components/ui/StatStrip";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { WelcomePanel } from "@/components/portal/WelcomePanel";
import { EmployeeWelcomePanel } from "@/components/portal/EmployeeWelcomePanel";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { useAuth } from "@/components/auth/AuthProvider";
import { InitialsAvatar, CheckinIndicator } from "@/components/portal/PatientListParts";
import {
  loadPortalDashboardStats, loadMyPortalPatientsSummary, loadTherapistWorkload, loadOrgActivitySummary,
  ATTENTION_REASON_LABELS, ATTENTION_BADGE_VARIANT, canViewClinicalData,
  type PortalDashboardStats, type PortalMyPatientsSummary, type PortalTherapistWorkload,
  type PortalOrgActivitySummary,
} from "@/lib/services/portalService";


export default function PortalDashboardPage() {
  const { checked, membership } = usePortalMembership();
  const { user } = useAuth();
  const [stats, setStats] = useState<PortalDashboardStats | null>(null);
  const [myPatients, setMyPatients] = useState<PortalMyPatientsSummary | null>(null);
  const [workload, setWorkload] = useState<{ rows: PortalTherapistWorkload[]; unassignedCount: number } | null>(null);
  const [activity, setActivity] = useState<PortalOrgActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);

  const isOwner = membership?.roleKey === "organization_owner";
  const isClinical = canViewClinicalData(membership?.roleKey);

  useEffect(() => {
    if (!checked || !membership || !user) return;
    let cancelled = false;
    Promise.all([
      loadPortalDashboardStats(membership.organizationId),
      // Klinische signalen (pijnscore, zwelling) alleen voor behandelaars.
      canViewClinicalData(membership.roleKey)
        ? loadMyPortalPatientsSummary(membership.organizationId, user.id)
        : Promise.resolve(null),
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

  // Voornaam uit het profiel ("Sanne de Vries" → "Sanne"), niet de rolnaam.
  const firstName = membership?.userFullName?.trim().split(/\s+/)[0] ?? null;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-8">
      <SectionHeader
        title={membership ? membership.organizationName : "Dashboard"}
        subtitle={membership ? (firstName ? `Welkom terug, ${firstName}` : "Welkom terug") : undefined}
      />

      {membership && stats && (
        isOwner ? (
          <WelcomePanel
            membershipId={membership.membershipId}
            organizationId={membership.organizationId}
            organizationName={membership.organizationName}
            stats={stats}
            initiallyWelcomed={!!membership.welcomedAt}
          />
        ) : user && (
          <EmployeeWelcomePanel
            membershipId={membership.membershipId}
            userId={user.id}
            organizationName={membership.organizationName}
            roleName={membership.roleName}
            stats={stats}
            initiallyWelcomed={!!membership.welcomedAt}
          />
        )
      )}

      <div className="space-y-4">
        {!isClinical && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { href: "/portal/patienten", title: "Patiënten", description: "Contactgegevens, behandelaar en locatie", icon: HeartPulse },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="block">
                <Card className="h-full transition-colors hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#fff3ee" }}>
                      <item.icon size={18} style={{ color: "var(--brand-accent, #e8632a)" }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 mt-2.5 shrink-0" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {isClinical && (
        <Card>
          <CardHeader title="Mijn patiënten" subtitle="Patiënten toegewezen aan jou" />
          {loading ? (
            <p className="text-sm text-subtle">Laden…</p>
          ) : !myPatients || myPatients.totalCount === 0 ? (
            <p className="text-sm text-subtle">Je hebt momenteel geen patiënten toegewezen.</p>
          ) : (
            <div className="space-y-5">
              <StatStrip
                items={[
                  { label: "Mijn patiënten", value: myPatients.totalCount, icon: HeartPulse },
                  { label: "Aandacht nodig", value: myPatients.needsAttentionCount, subtitle: "Hoge pijnscore, zwelling of weinig activiteit", icon: AlertTriangle, iconColor: "#f59e0b" },
                  { label: "Check-ins deze week", value: myPatients.checkinsThisWeekCount, icon: HeartPulse, iconColor: "#16a34a" },
                ]}
              />
              <ul className="rounded-xl border divide-y overflow-hidden" style={{ borderColor: "#e8e5df" }}>
                {myPatients.patients.slice(0, 8).map((p) => (
                  <li key={p.id} style={{ borderColor: "#f0ede8" }}>
                    <Link
                      href={`/portal/patienten/${p.id}`}
                      className="flex items-center gap-3 px-4 py-3 min-h-14 transition-colors hover:bg-[#faf9f7]"
                    >
                      <InitialsAvatar name={p.fullName} size={36} />
                      <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-3">
                        <div className="min-w-0 sm:flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.fullName || "Nog niet ingevuld"}</p>
                          <p className="text-xs mt-0.5"><CheckinIndicator date={p.lastCheckinDate} /></p>
                        </div>
                        {p.attentionReasons.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-2 sm:mt-0 sm:justify-end sm:shrink-0">
                            {p.attentionReasons.map((reason) => (
                              <Badge key={reason} variant={reason === "inactief" ? "warning" : ATTENTION_BADGE_VARIANT[reason]}>
                                {reason === "inactief" && !p.lastCheckinDate ? "Nog geen activiteit" : ATTENTION_REASON_LABELS[reason]}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-gray-300 shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
              {myPatients.totalCount > 8 && (
                <Link
                  href={`/portal/patienten?therapist=${user?.id ?? ""}`}
                  className="inline-flex items-center gap-1 min-h-11 text-sm font-medium"
                  style={{ color: "var(--brand-accent, #e8632a)" }}
                >
                  Bekijk alle {myPatients.totalCount} patiënten <ChevronRight size={14} />
                </Link>
              )}
            </div>
          )}
        </Card>
        )}

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-subtle mb-3">Organisatie</p>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Patiënten" value={loading ? "…" : stats?.patientCount ?? 0} icon={HeartPulse} />
            <StatCard label="Collega's" value={loading ? "…" : stats?.colleagueCount ?? 0} icon={Users} iconColor="#8b5cf6" />
          </div>
        </div>

        {isOwner && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <p className="text-sm text-subtle">Nog geen behandelaars.</p>
              )}
              <Link
                href="/portal/analyse#werkdruk"
                className="inline-flex items-center gap-1 min-h-11 text-sm font-medium mt-2"
                style={{ color: "var(--brand-accent, #e8632a)" }}
              >
                Volledig overzicht <ChevronRight size={14} />
              </Link>
            </Card>

            <Card>
              <CardHeader title="Activiteit" subtitle="Gebruik binnen je praktijk" />
              <div className="space-y-2">
                <Link href="/portal/patienten?checkin=older" className="flex items-center min-h-11 sm:min-h-0 sm:py-0.5 text-sm text-gray-700 hover:text-gray-900">
                  {activity ? activity.inactivePatientCount : "…"} patiënten zonder recente activiteit
                </Link>
                <Link href="/portal/medewerkers" className="flex items-center min-h-11 sm:min-h-0 sm:py-0.5 text-sm text-gray-700 hover:text-gray-900">
                  {activity ? activity.inactiveStaffCount : "…"} medewerkers niet recent ingelogd
                </Link>
              </div>
              <Link
                href="/portal/analyse"
                className="inline-flex items-center gap-1 min-h-11 text-sm font-medium mt-2"
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
