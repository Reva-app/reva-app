"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, FileBarChart2, ChevronRight } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ReportChart } from "@/components/reports/ReportChart";
import { InsightStatsCard } from "@/components/insights/InsightStatsCard";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { useReportData } from "@/lib/hooks/useReportData";
import { VIEW_ANALYTICS_ROLES, canViewClinicalData } from "@/lib/services/portalService";
import { REPORTS, REPORT_CATEGORY_LABELS, getReport, overviewKpis, overviewSeries, formatKpi, type OverviewKpi } from "@/lib/reports/reports";
import type { ReportPeriod } from "@/lib/services/reportService";

function readParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

function KpiTile({ k, href }: { k: OverviewKpi; href: string }) {
  const delta = k.value !== null && k.prev !== null && k.prev !== 0 ? ((k.value - k.prev) / Math.abs(k.prev)) * 100 : null;
  const good = delta === null || delta === 0 ? null : (k.betterWhen === "up" ? delta > 0 : delta < 0);
  return (
    <Link href={href} className="group rounded-2xl border bg-white p-4 transition-colors hover:border-gray-300" style={{ borderColor: "#e8e5df" }}>
      <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">{k.label}</p>
      <div className="flex items-end justify-between gap-2 mt-1.5">
        <p className="text-2xl font-bold tracking-tight text-gray-900 tabular-nums">{formatKpi(k.value, k.format)}</p>
        {delta !== null && Math.abs(delta) >= 0.5 && (
          <span className="inline-flex items-center text-xs font-semibold mb-1" style={{ color: good ? "#15803d" : "#b91c1c" }}>
            {delta > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(Math.round(delta))}%
          </span>
        )}
      </div>
      <p className="text-[11px] text-gray-400 mt-1">{k.prev === null ? "Geen vergelijking" : `Vorige periode: ${formatKpi(k.prev, k.format)}`}</p>
    </Link>
  );
}

const FEATURED = ["therapietrouw", "pijnverbetering", "actief-inactief", "testresultaten", "activatie", "tijd-per-fase"];

/**
 * Analyse-overzicht: de belangrijkste cijfers van herstel en praktijk, met
 * vergelijking met de vorige periode. De eigenaar ziet de praktijk (of één
 * behandelaar), een behandelaar de eigen patiënten. Details in Rapporten.
 */
export default function PortalAnalysePage() {
  const { checked, membership } = usePortalMembership();
  const isOwner = !!membership && VIEW_ANALYTICS_ROLES.includes(membership.roleKey);
  const canView = !!membership && (isOwner || canViewClinicalData(membership.roleKey));
  const [period, setPeriod] = useState<ReportPeriod>(() => ([7, 30, 90, 365].includes(Number(readParam("periode"))) ? Number(readParam("periode")) as ReportPeriod : 30));
  const [therapistId, setTherapistId] = useState<string | null>(() => readParam("behandelaar"));
  const { loading, data, prev } = useReportData(canView ? membership!.organizationId : null, period, isOwner ? therapistId : null, true);

  if (checked && !canView) return <p className="p-6 text-sm text-subtle">Je hebt geen toegang tot analyses.</p>;
  if (!membership) return <p className="p-6 text-sm text-subtle">Laden…</p>;

  const q = `?periode=${period}${isOwner && therapistId ? `&behandelaar=${therapistId}` : ""}`;
  const kpis = data ? overviewKpis(data, prev) : [];
  const series = data ? overviewSeries(data) : null;
  const outcome = data ? getReport("uitkomst")!.build(data) : null;
  const injuries = data ? getReport("per-blessure")!.build(data) : null;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <SectionHeader title="Analyse" subtitle={isOwner ? "Herstel en praktijk in cijfers" : "Het herstel van jouw patiënten in cijfers"} />
        <Link href={`/portal/analyse/rapporten${q}`} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: "var(--brand-accent, #e8632a)" }}>
          <FileBarChart2 size={15} /> Alle rapporten
        </Link>
      </div>

      <ReportFilters organizationId={membership.organizationId} isOwner={isOwner} period={period} onPeriod={setPeriod} therapistId={therapistId} onTherapist={setTherapistId} />

      {loading || !data ? (
        <p className="text-sm text-subtle py-10">Cijfers laden…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map((k) => <KpiTile key={k.label} k={k} href={`/portal/analyse/rapporten/${k.reportId}${q}`} />)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Betrokkenheid" subtitle="Check-ins en trainingen van patiënten" />
              {series && <ReportChart chart={{ kind: "line", labels: series.labels, series: [{ name: "Check-ins", values: series.checkins }, { name: "Trainingen", values: series.sessions }] }} />}
            </Card>
            <Card>
              <CardHeader title="Pijn" subtitle="Gemiddelde pijnscore uit de check-ins (lager is beter)" />
              {series && <ReportChart chart={{ kind: "line", labels: series.labels, series: [{ name: "Pijn", values: series.pain }], unit: "/10" }} />}
            </Card>
            <Card>
              <CardHeader title="Uitkomst bij afsluiting" subtitle="Afgesloten behandelingen in deze periode" />
              {outcome?.chart && <ReportChart chart={outcome.chart} />}
            </Card>
            <Card>
              <CardHeader title="Patiënten per blessuretype" subtitle="Actieve patiënten" />
              {injuries?.chart && <ReportChart chart={{ ...injuries.chart, labels: injuries.chart.labels.slice(0, 6), series: injuries.chart.series.map((s) => ({ ...s, values: s.values.slice(0, 6) })) }} />}
            </Card>
          </div>

          <Card>
            <CardHeader title="Veelgebruikte rapporten" subtitle="Met tabel, grafiek en export naar Excel" />
            <ul className="divide-y divide-[#f0ede8]">
              {FEATURED.map((id) => REPORTS.find((r) => r.id === id)!).map((r) => (
                <li key={r.id}>
                  <Link href={`/portal/analyse/rapporten/${r.id}${q}`} className="flex items-center gap-3 py-3 hover:bg-[#faf9f7] -mx-2 px-2 rounded-lg">
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-gray-900">{r.name}</span>
                      <span className="block text-xs text-gray-500 truncate">{r.description}</span>
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">{REPORT_CATEGORY_LABELS[r.category]}</span>
                    <ChevronRight size={15} className="text-gray-300 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {isOwner && <InsightStatsCard organizationId={membership.organizationId} days={Math.max(period, 30)} />}
        </>
      )}
    </div>
  );
}
