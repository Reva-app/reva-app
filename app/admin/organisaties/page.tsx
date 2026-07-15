"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/data";
import { loadAdminOrganizations, type AdminOrganization } from "@/lib/services/adminService";

function statusBadge(status: string) {
  if (status === "active") return <Badge variant="success">Actief</Badge>;
  if (status === "suspended") return <Badge variant="danger">Geschorst</Badge>;
  return <Badge variant="muted">{status}</Badge>;
}

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<AdminOrganization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadAdminOrganizations().then((data) => {
      if (cancelled) return;
      setOrgs(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <SectionHeader
        title="Organisaties"
        subtitle={loading ? "Laden…" : `${orgs.length} ${orgs.length === 1 ? "organisatie" : "organisaties"} op het platform`}
      />

      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {loading ? (
          <p className="text-sm text-gray-400 p-6">Laden…</p>
        ) : orgs.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Nog geen organisaties"
            description="Zodra er organisaties worden aangemaakt, verschijnen ze hier."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #e8e5df" }}>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Naam</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Status</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Vestigingen</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Patiënten</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Aangemaakt op</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((org) => (
                  <tr key={org.id} style={{ borderBottom: "1px solid #f8f7f4" }}>
                    <td className="px-5 py-3.5 font-medium text-gray-800">{org.name}</td>
                    <td className="px-5 py-3.5">{statusBadge(org.status)}</td>
                    <td className="px-5 py-3.5 text-gray-600">{org.locationCount}</td>
                    <td className="px-5 py-3.5 text-gray-600">{org.patientCount}</td>
                    <td className="px-5 py-3.5 text-gray-400">{formatDate(org.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
