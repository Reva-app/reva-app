"use client";

import { useEffect, useMemo, useState } from "react";
import { HeartPulse, Search } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScrollHintX } from "@/components/ui/table/ScrollHintX";
import { formatDate } from "@/lib/data";
import { loadPortalPatientDirectory, type PortalPatientContact } from "@/lib/services/portalService";

const inputStyle = { borderColor: "#e8e5df", background: "#ffffff", color: "#1a1a1a" };

function statusBadge(status: string) {
  if (status === "active") return <Badge variant="success">Actief</Badge>;
  if (status === "inactive") return <Badge variant="muted">Inactief</Badge>;
  if (status === "archived") return <Badge variant="muted">Gearchiveerd</Badge>;
  return <Badge variant="muted">{status}</Badge>;
}

/**
 * Patiëntenlijst voor niet-klinische rollen (o.a. de receptie): alleen
 * naam- en contactgegevens, behandelaar en locatie — geen blessure,
 * herstelplan of check-ins, en geen doorklik naar het dossier.
 * De data komt uit de afgeschermde RPC portal_patient_directory (migratie 122).
 */
export function PatientDirectory({ organizationId }: { organizationId: string }) {
  const [rows, setRows] = useState<PortalPatientContact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  useEffect(() => {
    let cancelled = false;
    loadPortalPatientDirectory(organizationId).then((result) => {
      if (cancelled) return;
      setRows(result.rows);
      setError(result.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.name, r.email, r.phone].some((v) => v?.toLowerCase().includes(q));
    });
  }, [rows, search, statusFilter]);

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">
      <SectionHeader
        title="Patiënten"
        subtitle={loading ? "Laden…" : `${filtered.length} van ${rows.length} ${rows.length === 1 ? "patiënt" : "patiënten"} · contactgegevens`}
      />

      <div className="rounded-2xl border p-4 flex flex-wrap gap-3 items-end" style={{ background: "#ffffff", borderColor: "#e8e5df" }}>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Zoeken</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Naam, e-mailadres of telefoonnummer…"
              className="w-full text-base sm:text-sm rounded-xl border pl-9 pr-3 py-2 focus:outline-none min-h-11 sm:min-h-0" style={inputStyle}
            />
          </div>
        </div>
        <div className="w-full sm:w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full text-base sm:text-sm rounded-xl border px-3 py-2 focus:outline-none min-h-11 sm:min-h-0" style={inputStyle}>
            <option value="">Alle</option>
            <option value="active">Actief</option>
            <option value="inactive">Inactief</option>
            <option value="archived">Gearchiveerd</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {loading ? (
          <p className="text-sm text-gray-400 p-6">Laden…</p>
        ) : error ? (
          <EmptyState icon={HeartPulse} title="Kon de patiëntenlijst niet laden" description={`${error} Probeer de pagina te verversen.`} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={HeartPulse}
            title={rows.length === 0 ? "Nog geen patiënten" : "Geen patiënten gevonden"}
            description={rows.length === 0 ? "Zodra een behandelaar een patiënt toevoegt, verschijnt die hier." : "Pas je zoekopdracht of het statusfilter aan."}
          />
        ) : (
          <ScrollHintX>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #e8e5df" }}>
                  {["Naam", "Geboortedatum", "Telefoon", "E-mail", "Behandelaar", "Locatie", "Status"].map((h) => (
                    <th key={h} className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f8f7f4" }}>
                    <td className="px-5 py-3.5 font-medium text-gray-800 whitespace-nowrap">{r.name || "Nog niet ingevuld"}</td>
                    <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{r.dateOfBirth ? formatDate(r.dateOfBirth) : "—"}</td>
                    <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                      {r.phone ? <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="hover:underline">{r.phone}</a> : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {r.email ? <a href={`mailto:${r.email}`} className="hover:underline break-all">{r.email}</a> : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{r.therapistName || "—"}</td>
                    <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{r.locationName || "—"}</td>
                    <td className="px-5 py-3.5">{statusBadge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollHintX>
        )}
      </div>
    </div>
  );
}
