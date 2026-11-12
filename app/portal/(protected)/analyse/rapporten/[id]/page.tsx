"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ReportChart } from "@/components/reports/ReportChart";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { useReportData } from "@/lib/hooks/useReportData";
import { VIEW_ANALYTICS_ROLES, canViewClinicalData } from "@/lib/services/portalService";
import { getReport, tableToCsv, REPORT_CATEGORY_LABELS, type ReportCell } from "@/lib/reports/reports";
import { REPORT_PERIODS, type ReportPeriod } from "@/lib/services/reportService";

function readParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

function cell(v: ReportCell): string {
  if (v === null || v === undefined) return "—";
  return typeof v === "number" ? v.toLocaleString("nl-NL", { maximumFractionDigits: 1 }) : v;
}

export default function PortalReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const report = getReport(id);
  const { checked, membership } = usePortalMembership();
  const isOwner = !!membership && VIEW_ANALYTICS_ROLES.includes(membership.roleKey);
  const canView = !!membership && (isOwner || canViewClinicalData(membership.roleKey)) && !!report && (isOwner || !report.ownerOnly);
  const [period, setPeriod] = useState<ReportPeriod>(() => ([7, 30, 90, 365].includes(Number(readParam("periode"))) ? Number(readParam("periode")) as ReportPeriod : 30));
  const [therapistId, setTherapistId] = useState<string | null>(() => readParam("behandelaar"));
  const { loading, data } = useReportData(canView ? membership!.organizationId : null, period, isOwner ? therapistId : null);

  if (!report) return <p className="p-6 text-sm text-subtle">Dit rapport bestaat niet.</p>;
  if (checked && !canView) return <p className="p-6 text-sm text-subtle">Je hebt geen toegang tot dit rapport.</p>;
  if (!membership) return <p className="p-6 text-sm text-subtle">Laden…</p>;

  const result = data ? report.build(data) : null;
  const q = `?periode=${period}${isOwner && therapistId ? `&behandelaar=${therapistId}` : ""}`;

  function exportCsv() {
    if (!result) return;
    const blob = new Blob(["﻿" + tableToCsv(result.table)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${report!.id}-${data!.from}-tot-${data!.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <Link href={`/portal/analyse/rapporten${q}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"><ArrowLeft size={14} /> Rapporten</Link>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{REPORT_CATEGORY_LABELS[report.category]}</p>
          <SectionHeader title={report.name} subtitle={report.description} />
        </div>
        <Button size="sm" variant="secondary" onClick={exportCsv} disabled={!result || result.table.rows.length === 0}><Download size={14} /> Exporteren</Button>
      </div>

      <ReportFilters organizationId={membership.organizationId} isOwner={isOwner} period={period} onPeriod={setPeriod} therapistId={therapistId} onTherapist={setTherapistId} />

      {loading || !result ? (
        <p className="text-sm text-subtle py-10">Rapport laden…</p>
      ) : (
        <>
          {result.kpis.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {result.kpis.map((k) => (
                <div key={k.label} className="rounded-2xl border bg-white p-4" style={{ borderColor: "#e8e5df" }}>
                  <p className="text-xs font-medium text-gray-500">{k.label}</p>
                  <p className="text-2xl font-bold tracking-tight text-gray-900 mt-1.5 tabular-nums">{k.value}</p>
                  {k.hint && <p className="text-[11px] text-gray-400 mt-1">{k.hint}</p>}
                </div>
              ))}
            </div>
          )}

          {result.chart && (
            <Card>
              <p className="text-sm font-semibold text-gray-900 mb-3">{report.name} · {REPORT_PERIODS.find((p) => p.value === period)?.label.toLowerCase()}</p>
              <ReportChart chart={result.chart} height={240} />
            </Card>
          )}

          <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: "#e8e5df" }}>
            {result.table.rows.length === 0 ? (
              <p className="text-sm text-gray-500 p-6">Geen gegevens voor deze periode.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-gray-500" style={{ background: "#faf9f7", borderColor: "#f0ede8" }}>
                      {result.table.columns.map((c) => <th key={c.key} className={`px-4 py-2.5 font-medium whitespace-nowrap ${c.align === "right" ? "text-right" : "text-left"}`}>{c.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {result.table.rows.map((r, i) => (
                      <tr key={i} className="border-b last:border-b-0" style={{ borderColor: "#f0ede8" }}>
                        {result.table.columns.map((c) => <td key={c.key} className={`px-4 py-2.5 ${c.align === "right" ? "text-right tabular-nums" : "text-left"} ${c === result.table.columns[0] ? "font-medium text-gray-900" : "text-gray-700"}`}>{cell(r[c.key] ?? null)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {result.note && <p className="text-xs text-gray-500">{result.note}</p>}
        </>
      )}
    </div>
  );
}
