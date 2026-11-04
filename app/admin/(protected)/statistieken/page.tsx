"use client";

import { useEffect, useState } from "react";
import { CalendarCheck2, Timer, TrendingUp, Building2 } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Bar } from "@/components/ui/Charts";
import {
  loadAdminRecoveryDurationStats, loadAdminDashboardStats,
  type AdminRecoveryDurationStats, type AdminDashboardStats,
} from "@/lib/services/adminService";
import { INJURY_CATEGORY_LABELS } from "@/lib/services/protocolService";

/**
 * Platformbrede statistieken, gebundeld over alle aangesloten praktijken —
 * bedoeld voor de platformeigenaar om zelf naar buiten mee te treden
 * (gemiddelde doorlooptijd per blessure, aantal behandelde patiënten),
 * los van de per-praktijk cijfers op elke praktijk's eigen Analyse-pagina.
 */
export default function AdminStatistiekenPage() {
  const [recovery, setRecovery] = useState<AdminRecoveryDurationStats | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadAdminRecoveryDurationStats(), loadAdminDashboardStats()]).then(([recoveryData, dashboardData]) => {
      if (cancelled) return;
      setRecovery(recoveryData);
      setDashboard(dashboardData);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const currentYear = new Date().getFullYear();
  const patientsThisYear = recovery?.patientsPerYear.find((y) => y.year === currentYear)?.count ?? 0;
  const maxByCategory = Math.max(1, ...(recovery?.byInjuryCategory.map((c) => c.avgDurationDays) ?? [0]));
  const maxByYear = Math.max(1, ...(recovery?.patientsPerYear.map((y) => y.count) ?? [0]));

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <SectionHeader
        title="Statistieken"
        subtitle="Herstel en doorlooptijd, gebundeld over alle praktijken op het platform"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Praktijken" value={loading ? "…" : dashboard?.organizationCount ?? 0} icon={Building2} />
        <StatCard label="Patiënten platformbreed" value={loading ? "…" : dashboard?.patientCount ?? 0} icon={TrendingUp} iconColor="#3b82f6" />
        <StatCard
          label="Patiënten afgesloten"
          value={loading ? "…" : recovery?.totalDischarged ?? 0}
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
      </div>

      <Card>
        <CardHeader
          title="Gemiddelde doorlooptijd per blessure"
          subtitle="Alle praktijken gebundeld, over alle afgesloten behandelingen"
        />
        {recovery && recovery.byInjuryCategory.length > 0 ? (
          <div className="space-y-3">
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
          <p className="text-sm text-gray-400">
            Nog geen afgesloten behandelingen op het platform. Zodra praktijken afsluitdatums invullen bij hun patiënten, verschijnt hier de doorlooptijd per blessure.
          </p>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Nieuwe patiënten per jaar"
          subtitle={`Waarvan ${patientsThisYear} in ${currentYear}`}
        />
        {recovery && recovery.patientsPerYear.length > 0 ? (
          <div className="space-y-3">
            {recovery.patientsPerYear.map((y) => (
              <Bar key={y.year} label={String(y.year)} value={y.count} max={maxByYear} format={(v) => String(v)} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Nog geen patiënten geregistreerd.</p>
        )}
      </Card>
    </div>
  );
}
