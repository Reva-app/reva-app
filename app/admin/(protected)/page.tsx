"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, MapPin, HeartPulse, Users, ChevronRight, TrendingUp, Activity, AlertTriangle } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/data";
import {
  loadAdminDashboardStats,
  loadAdminOrganizations,
  loadAdminPlatformActivity,
  loadAdminOrgLastActivity,
  type AdminDashboardStats,
  type AdminOrganization,
  type AdminPlatformActivity,
  type AdminOrgActivityRow,
} from "@/lib/services/adminService";
import { loadSalesLeads, summarizeSalesLeads, type SalesLead } from "@/lib/services/salesPipelineService";

const STAGE_LABELS: Record<string, string> = {
  nieuw: "Nieuw",
  contact_gelegd: "Contact gelegd",
  demo_gepland: "Demo gepland",
  onderhandeling: "Onderhandeling",
};

function formatEuro(value: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [orgs, setOrgs] = useState<AdminOrganization[]>([]);
  const [platformActivity, setPlatformActivity] = useState<AdminPlatformActivity | null>(null);
  const [orgLastActivity, setOrgLastActivity] = useState<AdminOrgActivityRow[]>([]);
  const [salesLeads, setSalesLeads] = useState<SalesLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadAdminDashboardStats(),
      loadAdminOrganizations(),
      loadAdminPlatformActivity(),
      loadAdminOrgLastActivity(),
      loadSalesLeads(),
    ]).then(([s, orgsData, activity, orgActivity, leads]) => {
      if (cancelled) return;
      setStats(s);
      setOrgs(orgsData);
      setPlatformActivity(activity);
      setOrgLastActivity(orgActivity);
      setSalesLeads(leads);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const recentOrgs = orgs.slice(0, 5);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const newThisMonth = orgs.filter((o) => new Date(o.createdAt) >= monthStart).length;

  const lastActivityByOrg = new Map(orgLastActivity.map((r) => [r.organizationId, r.lastSignInAt]));
  const inactiveOrgCount = orgs.filter((o) => {
    const lastSignIn = lastActivityByOrg.get(o.id) ?? null;
    if (!lastSignIn) return true;
    const days = (new Date().getTime() - new Date(lastSignIn).getTime()) / (1000 * 60 * 60 * 24);
    return days > 30;
  }).length;

  const salesSummary = summarizeSalesLeads(salesLeads);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-8">
      <SectionHeader
        title="Platform Dashboard"
        subtitle="Overzicht van het REVA-platform"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Bedrijven"
          value={loading ? "…" : stats?.organizationCount ?? 0}
          icon={Building2}
        />
        <StatCard
          label="Locaties"
          value={loading ? "…" : stats?.locationCount ?? 0}
          icon={MapPin}
          iconColor="#3b82f6"
        />
        <StatCard
          label="Patiënten"
          value={loading ? "…" : stats?.patientCount ?? 0}
          icon={HeartPulse}
          iconColor="#16a34a"
        />
        <StatCard
          label="Gebruikers"
          value={loading ? "…" : stats?.userCount ?? 0}
          icon={Users}
          iconColor="#8b5cf6"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Nieuwe bedrijven deze maand"
          value={loading ? "…" : newThisMonth}
          icon={TrendingUp}
          iconColor="#3b82f6"
        />
        <StatCard
          label="Check-ins laatste 30 dagen"
          subtitle="Platformbreed"
          value={loading ? "…" : platformActivity?.checkinsLast30Days ?? 0}
          icon={Activity}
          iconColor="#0d9488"
        />
        <StatCard
          label="Bedrijven zonder recente activiteit"
          subtitle="Langer dan 30 dagen geen login"
          value={loading ? "…" : inactiveOrgCount}
          icon={AlertTriangle}
          iconColor="#f59e0b"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            title="Recente bedrijven"
            subtitle="Laatst aangemaakte bedrijven op het platform"
            action={
              <Link
                href="/admin/organisaties"
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: "#e8632a" }}
              >
                Alles bekijken
                <ChevronRight size={13} />
              </Link>
            }
          />
          {loading ? (
            <p className="text-sm text-gray-400 mt-2">Laden…</p>
          ) : recentOrgs.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Nog geen bedrijven"
              description="Zodra er bedrijven worden aangemaakt, verschijnen ze hier."
            />
          ) : (
            <div className="space-y-0 mt-2">
              {recentOrgs.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between py-3"
                  style={{ borderBottom: "1px solid #f8f7f4" }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{org.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {org.locationCount} {org.locationCount === 1 ? "locatie" : "locaties"} ·{" "}
                      {org.patientCount} {org.patientCount === 1 ? "patiënt" : "patiënten"}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 ml-4">
                    {formatDate(org.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Pijplijn"
            subtitle="Openstaande deals in de sales pipeline"
            action={
              <Link
                href="/admin/pijplijn"
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: "#e8632a" }}
              >
                Bekijk pijplijn
                <ChevronRight size={13} />
              </Link>
            }
          />
          {loading ? (
            <p className="text-sm text-gray-400 mt-2">Laden…</p>
          ) : salesSummary.openCount === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="Nog geen deals"
              description="Zodra je bedrijven benadert, verschijnen ze hier."
            />
          ) : (
            <div className="mt-2 space-y-3">
              <p className="text-sm text-gray-600">
                {Object.entries(salesSummary.openByStage)
                  .map(([stage, count]) => `${STAGE_LABELS[stage]}: ${count}`)
                  .join(" · ")}
              </p>
              <p className="text-sm font-semibold text-gray-900">
                Totale geschatte waarde: {formatEuro(salesSummary.totalEstimatedValueOpen)}
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
