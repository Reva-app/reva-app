"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, MapPin, HeartPulse, Users, ChevronRight } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/data";
import {
  loadAdminDashboardStats,
  loadAdminOrganizations,
  type AdminDashboardStats,
  type AdminOrganization,
} from "@/lib/services/adminService";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [recentOrgs, setRecentOrgs] = useState<AdminOrganization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadAdminDashboardStats(), loadAdminOrganizations()]).then(
      ([s, orgs]) => {
        if (cancelled) return;
        setStats(s);
        setRecentOrgs(orgs.slice(0, 5));
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-8">
      <SectionHeader
        title="Platform Dashboard"
        subtitle="Overzicht van het REVA-platform"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Organisaties"
          value={loading ? "…" : stats?.organizationCount ?? 0}
          icon={Building2}
        />
        <StatCard
          label="Vestigingen"
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

      <Card>
        <CardHeader
          title="Recente organisaties"
          subtitle="Laatst aangemaakte organisaties op het platform"
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
            title="Nog geen organisaties"
            description="Zodra er organisaties worden aangemaakt, verschijnen ze hier."
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
                    {org.locationCount} {org.locationCount === 1 ? "vestiging" : "vestigingen"} ·{" "}
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
    </div>
  );
}
