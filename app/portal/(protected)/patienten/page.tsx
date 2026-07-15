"use client";

import { useEffect, useState } from "react";
import { HeartPulse } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/data";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { loadPortalPatients, type PortalPatient } from "@/lib/services/portalService";

function statusBadge(status: string) {
  if (status === "active") return <Badge variant="success">Actief</Badge>;
  if (status === "inactive") return <Badge variant="muted">Inactief</Badge>;
  if (status === "archived") return <Badge variant="muted">Gearchiveerd</Badge>;
  return <Badge variant="muted">{status}</Badge>;
}

export default function PortalPatientsPage() {
  const { checked, membership } = usePortalMembership();
  const [patients, setPatients] = useState<PortalPatient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!checked || !membership) return;
    let cancelled = false;
    loadPortalPatients(membership.organizationId).then((data) => {
      if (cancelled) return;
      setPatients(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [checked, membership]);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <SectionHeader
        title="Patiënten"
        subtitle={loading ? "Laden…" : `${patients.length} ${patients.length === 1 ? "patiënt" : "patiënten"} binnen deze organisatie`}
      />

      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {loading ? (
          <p className="text-sm text-gray-400 p-6">Laden…</p>
        ) : patients.length === 0 ? (
          <EmptyState
            icon={HeartPulse}
            title="Nog geen patiënten"
            description="Zodra patiënten aan deze organisatie gekoppeld worden, verschijnen ze hier."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #e8e5df" }}>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Naam</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">E-mail</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Vestiging</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Status</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Toegevoegd op</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f8f7f4" }}>
                    <td className="px-5 py-3.5 font-medium text-gray-800">{p.fullName || "Nog niet gekoppeld"}</td>
                    <td className="px-5 py-3.5 text-gray-600">{p.email || "—"}</td>
                    <td className="px-5 py-3.5 text-gray-600">{p.locationName || "—"}</td>
                    <td className="px-5 py-3.5">{statusBadge(p.status)}</td>
                    <td className="px-5 py-3.5 text-gray-400">{formatDate(p.createdAt)}</td>
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
