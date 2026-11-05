"use client";

import { useEffect, useState } from "react";
import { Activity, ClipboardCheck, HeartPulse, DoorOpen, Sparkles, ShieldCheck, Clock, CalendarCheck2, Timer } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { LineChart, Bar, PeriodFilter, type Period } from "@/components/ui/Charts";
import { formatDate } from "@/lib/data";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import {
  loadOrgUsageStats, loadTherapistWorkload, loadPortalStaffOverview, loadRoomOccupancyStats, loadQualityStats,
  loadRecoveryDurationStats,
  VIEW_ANALYTICS_ROLES, STAFF_INACTIVITY_THRESHOLD_DAYS, isDateStale,
  type PortalOrgUsageStats, type PortalTherapistWorkload, type PortalStaffMember, type PortalRoomOccupancy, type PortalQualityStats,
  type PortalRecoveryDurationStats,
} from "@/lib/services/portalService";
import { INJURY_CATEGORY_LABELS } from "@/lib/services/protocolService";

/** Zichtbaar gelabelde aanname i.p.v. verstopt in een databasefunctie — zie migratie 115. */
const MINUTES_SAVED_PER_AI_INTAKE = 5;
const MINUTES_SAVED_PER_AI_ROOM_SUGGESTION = 2;

function formatMinutes(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}u` : `${hours}u ${minutes}min`;
}

export default function PortalAnalysePage() {
  const { checked, membership } = usePortalMembership();
  const [period, setPeriod] = useState<Period>(30);
  const [stats, setStats] = useState<PortalOrgUsageStats | null>(null);
  const [occupancy, setOccupancy] = useState<PortalRoomOccupancy[] | null>(null);
  const [quality, setQuality] = useState<PortalQualityStats | null>(null);
  const [workload, setWorkload] = useState<{ rows: PortalTherapistWorkload[]; unassignedCount: number } | null>(null);
  const [staff, setStaff] = useState<PortalStaffMember[]>([]);
  const [recovery, setRecovery] = useState<PortalRecoveryDurationStats | null>(null);
  const [loading, setLoading] = useState(true);

  const canView = !!membership && VIEW_ANALYTICS_ROLES.includes(membership.roleKey);

  useEffect(() => {
    if (!checked || !membership || !canView) return;
    let cancelled = false;
    Promise.all([
      loadOrgUsageStats(membership.organizationId, period),
      loadRoomOccupancyStats(membership.organizationId, period),
      loadQualityStats(membership.organizationId, period),
    ]).then(([statsData, occupancyData, qualityData]) => {
      if (cancelled) return;
      setStats(statsData);
      setOccupancy(occupancyData);
      setQuality(qualityData);
    });
    return () => { cancelled = true; };
  }, [checked, membership, canView, period]);

  useEffect(() => {
    if (!checked || !membership || !canView) return;
    let cancelled = false;
    Promise.all([
      loadTherapistWorkload(membership.organizationId),
      loadPortalStaffOverview(membership.organizationId),
      loadRecoveryDurationStats(membership.organizationId),
    ]).then(([workloadData, staffData, recoveryData]) => {
      if (cancelled) return;
      setWorkload(workloadData);
      setStaff(staffData.filter((m) => m.kind === "member" && m.status === "active"));
      setRecovery(recoveryData);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [checked, membership, canView]);

  if (checked && membership && !canView) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <SectionHeader title="Analyse" subtitle="Gebruik en activiteit van je praktijk" />
        <p className="text-sm text-subtle mt-4">
          Alleen de praktijkeigenaar kan de analysepagina bekijken.
        </p>
      </div>
    );
  }

  const maxWorkload = Math.max(1, ...(workload?.rows.map((r) => r.patientCount) ?? [0]));
  const maxTrendCheckins = Math.max(1, ...(stats?.trend.map((p) => p.checkins) ?? [0]));
  const maxTrendTrainings = Math.max(1, ...(stats?.trend.map((p) => p.trainingsCompleted) ?? [0]));

  const estimatedMinutesSaved = quality
    ? quality.aiIntakeCount * MINUTES_SAVED_PER_AI_INTAKE + quality.aiRoomSuggestionsTakenCount * MINUTES_SAVED_PER_AI_ROOM_SUGGESTION
    : 0;
  const checkinDocumentationRate = quality && quality.completedPhasesCount > 0
    ? Math.round((quality.completedPhasesWithCheckinCount / quality.completedPhasesCount) * 100)
    : null;
  const totalReservedMinutes = (occupancy ?? []).reduce((sum, o) => sum + o.reservedMinutes, 0);
  const totalAvailableMinutes = (occupancy ?? []).reduce((sum, o) => sum + o.availableMinutes, 0);
  const overallOccupancyPct = totalAvailableMinutes > 0 ? Math.round((totalReservedMinutes / totalAvailableMinutes) * 100) : null;

  const currentYear = new Date().getFullYear();
  const patientsThisYear = recovery?.patientsPerYear.find((y) => y.year === currentYear)?.count ?? 0;
  const maxByCategory = Math.max(1, ...(recovery?.byInjuryCategory.map((c) => c.avgDurationDays) ?? [0]));
  const maxByYear = Math.max(1, ...(recovery?.patientsPerYear.map((y) => y.count) ?? [0]));

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      <Card>
        <CardHeader
          title="Automatisering & kwaliteit"
          subtitle="Wat REVA voor je regelt, en hoe goed vastleggingen worden bijgehouden"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Tijd bespaard (schatting)"
            value={quality ? formatMinutes(estimatedMinutesSaved) : "…"}
            subtitle={`~${MINUTES_SAVED_PER_AI_INTAKE} min/AI-analyse, ~${MINUTES_SAVED_PER_AI_ROOM_SUGGESTION} min/ruimteplanning`}
            icon={Clock}
            iconColor="#e8632a"
          />
          <StatCard
            label="AI-intakeanalyses"
            value={quality ? quality.aiIntakeCount : "…"}
            subtitle="Automatisch samengevat bij intake"
            icon={Sparkles}
            iconColor="#8b5cf6"
          />
          <StatCard
            label="Ruimteplanningen via AI"
            value={quality ? quality.aiRoomSuggestionsTakenCount : "…"}
            subtitle="AI-suggesties overgenomen"
            icon={DoorOpen}
            iconColor="#3b82f6"
          />
          <StatCard
            label="Documentatiegraad faseovergangen"
            value={checkinDocumentationRate !== null ? `${checkinDocumentationRate}%` : "n.v.t."}
            subtitle={quality && quality.completedPhasesCount > 0
              ? `${quality.completedPhasesWithCheckinCount} van ${quality.completedPhasesCount} fases met check-in`
              : "Nog geen fases afgerond"}
            icon={ShieldCheck}
            iconColor="#16a34a"
          />
        </div>
      </Card>

      <div id="ruimtebezetting">
        <Card>
          <CardHeader
            title="Ruimtebezetting per locatie"
            subtitle={overallOccupancyPct !== null ? `Gemiddeld ${overallOccupancyPct}% bezet in deze periode` : "Nog geen ruimtes ingericht"}
          />
          {occupancy && occupancy.length > 0 ? (
            <div className="space-y-3">
              {occupancy.map((o) => {
                const pct = o.availableMinutes > 0 ? Math.round((o.reservedMinutes / o.availableMinutes) * 100) : 0;
                return (
                  <Bar
                    key={o.locationId}
                    label={`${o.locationName} (${o.roomCount} ${o.roomCount === 1 ? "ruimte" : "ruimtes"})`}
                    value={pct}
                    max={100}
                    format={(v) => `${v}%`}
                    sublabel={`${formatMinutes(o.reservedMinutes)} van ${formatMinutes(o.availableMinutes)}`}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-subtle">
              Nog geen ruimtes met reserveringen. Voeg ruimtes toe bij een locatie en plan reserveringen in via Reserveringen.
            </p>
          )}
        </Card>
      </div>

      <div id="herstel">
        <Card>
          <CardHeader
            title="Herstel & doorlooptijd"
            subtitle="Op basis van de afsluitdatum per patiënt (Patiëntgegevens → Afsluiting behandeling)"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <StatCard
              label="Patiënten afgesloten"
              value={recovery ? recovery.totalDischarged : "…"}
              subtitle="In totaal"
              icon={CalendarCheck2}
              iconColor="#16a34a"
            />
            <StatCard
              label="Gemiddelde doorlooptijd"
              value={recovery?.avgDurationDays != null ? `${Math.round(recovery.avgDurationDays)} dagen` : "n.v.t."}
              subtitle="Vanaf start herstelplan tot afsluiting"
              icon={Timer}
              iconColor="#e8632a"
            />
            <StatCard
              label={`Afgesloten in ${currentYear}`}
              value={recovery ? patientsThisYear : "…"}
              subtitle="Dit kalenderjaar"
              icon={ClipboardCheck}
              iconColor="#8b5cf6"
            />
          </div>

          {recovery && recovery.byInjuryCategory.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gemiddelde doorlooptijd per blessure</p>
              {recovery.byInjuryCategory.map((c) => (
                <Bar
                  key={c.injuryCategory}
                  label={`${INJURY_CATEGORY_LABELS[c.injuryCategory] ?? c.injuryCategory} (${c.count})`}
                  value={c.avgDurationDays}
                  max={maxByCategory}
                  format={(v) => `${Math.round(v)}d`}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-subtle">
              Nog geen afgesloten behandelingen. Zodra je bij een patiënt een afsluitdatum invult, verschijnt hier de doorlooptijd per blessure.
            </p>
          )}

          {recovery && recovery.patientsPerYear.length > 0 && (
            <div className="space-y-3 mt-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nieuwe patiënten per jaar</p>
              {recovery.patientsPerYear.map((y) => (
                <Bar key={y.year} label={String(y.year)} value={y.count} max={maxByYear} format={(v) => String(v)} />
              ))}
            </div>
          )}
        </Card>
      </div>

      <div id="werkdruk">
        <Card>
          <CardHeader title="Werkdruk per behandelaar" subtitle="Aantal actieve patiënten, puur ter info" />
          {loading ? (
            <p className="text-sm text-subtle">Laden…</p>
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
            <p className="text-sm text-subtle">Nog geen behandelaars om werkdruk voor te tonen.</p>
          )}
          {workload && workload.unassignedCount > 0 && (
            <p className="text-xs text-subtle mt-4">
              {workload.unassignedCount} {workload.unassignedCount === 1 ? "patiënt is" : "patiënten zijn"} nog niet toegewezen aan een behandelaar.
            </p>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Teamactiviteit" subtitle="Laatste keer ingelogd per medewerker" />
        {loading ? (
          <p className="text-sm text-subtle">Laden…</p>
        ) : staff.length > 0 ? (
          <div className="space-y-2.5">
            {staff.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 py-1.5">
                <span className="text-sm text-gray-700 truncate">{m.fullName ?? m.email ?? "Onbekend"}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-subtle">
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
          <p className="text-sm text-subtle">Nog geen medewerkers.</p>
        )}
      </Card>
    </div>
  );
}
