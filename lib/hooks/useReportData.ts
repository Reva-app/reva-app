"use client";

import { useEffect, useState } from "react";
import { loadReportData, periodRange, type ReportData, type ReportPeriod } from "@/lib/services/reportService";

/**
 * Rapportdata voor een periode (en optioneel de periode ervoor, voor de
 * vergelijking op het overzicht). Herlaadt bij elke filterwijziging.
 */
export function useReportData(organizationId: string | null, period: ReportPeriod, therapistId: string | null, compare = false) {
  const [state, setState] = useState<{ key: string; cur: ReportData | null; prev: ReportData | null } | null>(null);
  const key = `${organizationId}|${period}|${therapistId}|${compare}`;

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    const r = periodRange(period);
    Promise.all([
      loadReportData(organizationId, r.from, r.to, therapistId),
      compare ? loadReportData(organizationId, r.prevFrom, r.prevTo, therapistId) : Promise.resolve(null),
    ]).then(([cur, prev]) => { if (!cancelled) setState({ key, cur, prev }); });
    return () => { cancelled = true; };
  }, [organizationId, period, therapistId, compare, key]);

  const fresh = state?.key === key;
  return { loading: !fresh, data: fresh ? state!.cur : null, prev: fresh ? state!.prev : null };
}
