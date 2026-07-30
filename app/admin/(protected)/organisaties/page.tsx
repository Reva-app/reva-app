"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, Loader2, Search } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/data";
import {
  loadAdminOrganizations, createAdminOrganization, loadAdminRoles, inviteAdminOrgMember,
  type AdminOrganization,
} from "@/lib/services/adminService";

const inputStyle = {
  borderColor: "#e8e5df",
  background: "#f8f7f4",
  color: "#1a1a1a",
};

const PAGE_SIZE = 20;

export function orgStatusBadge(status: string) {
  if (status === "active") return <Badge variant="success">Actief</Badge>;
  if (status === "trial") return <Badge variant="warning">Trial</Badge>;
  if (status === "paused") return <Badge variant="danger">Gepauzeerd</Badge>;
  return <Badge variant="muted">{status}</Badge>;
}

export default function AdminOrganizationsPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<AdminOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) {
      setCreateError("Vul een bedrijfsnaam in");
      return;
    }
    const ownerFieldsUsed = ownerFirstName.trim() || ownerLastName.trim() || ownerEmail.trim();
    if (ownerFieldsUsed && (!ownerFirstName.trim() || !ownerLastName.trim() || !ownerEmail.trim())) {
      setCreateError("Vul voornaam, achternaam én e-mailadres van de eigenaar in, of laat alle drie leeg");
      return;
    }

    setCreating(true);
    setCreateError("");
    const { id, error } = await createAdminOrganization(newName.trim());
    if (error || !id) {
      setCreating(false);
      setCreateError(error || "Aanmaken is niet gelukt");
      return;
    }

    if (ownerFieldsUsed) {
      const roles = await loadAdminRoles();
      const ownerRole = roles.find((r) => r.key === "organization_owner");
      if (!ownerRole) {
        setCreating(false);
        router.push(`/admin/organisaties/${id}?inviteError=${encodeURIComponent("Rol 'Practice Owner' niet gevonden: bedrijf is wel aangemaakt.")}`);
        return;
      }
      const { error: inviteError } = await inviteAdminOrgMember(id, {
        firstName: ownerFirstName, lastName: ownerLastName, email: ownerEmail, roleId: ownerRole.id, locationId: null,
      });
      setCreating(false);
      if (inviteError) {
        router.push(`/admin/organisaties/${id}?inviteError=${encodeURIComponent(inviteError)}`);
        return;
      }
      router.push(`/admin/organisaties/${id}`);
      return;
    }

    setCreating(false);
    router.push(`/admin/organisaties/${id}`);
  }

  const filteredOrgs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orgs;
    return orgs.filter((org) => org.name.toLowerCase().includes(term));
  }, [orgs, search]);

  const totalPages = Math.max(1, Math.ceil(filteredOrgs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedOrgs = filteredOrgs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <SectionHeader
          title="Bedrijven"
          subtitle={loading ? "Laden…" : `${orgs.length} ${orgs.length === 1 ? "bedrijf" : "bedrijven"} op het platform`}
        />
        <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
          <Plus size={14} />
          Nieuw bedrijf
        </Button>
      </div>

      {showCreate && (
        <div
          className="rounded-2xl border p-5"
          style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Bedrijfsnaam</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Bijv. Fysiotherapie Voorbeeldpraktijk"
                className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none"
                style={inputStyle}
              />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Eigenaar uitnodigen (optioneel)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text" value={ownerFirstName} onChange={(e) => setOwnerFirstName(e.target.value)}
                  placeholder="Voornaam" className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none" style={inputStyle}
                />
                <input
                  type="text" value={ownerLastName} onChange={(e) => setOwnerLastName(e.target.value)}
                  placeholder="Achternaam" className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none" style={inputStyle}
                />
                <input
                  type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="E-mailadres" className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none" style={inputStyle}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Ingevuld? Dan ontvangt deze persoon direct een e-mail om zelf een wachtwoord in te stellen en het bedrijf als Practice Owner te beheren. Leeg gelaten: alleen een leeg bedrijf wordt aangemaakt.
              </p>
            </div>

            {createError && <p className="text-xs" style={{ color: "#dc2626" }}>{createError}</p>}
            <Button type="submit" size="sm" disabled={creating}>
              {creating ? <Loader2 size={14} className="animate-spin" /> : "Aanmaken"}
            </Button>
          </form>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Zoek op bedrijfsnaam…"
          className="w-full text-sm rounded-xl border pl-9 pr-4 py-2.5 focus:outline-none"
          style={inputStyle}
        />
      </div>

      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {loading ? (
          <p className="text-sm text-gray-400 p-6">Laden…</p>
        ) : filteredOrgs.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={search ? "Geen bedrijven gevonden" : "Nog geen bedrijven"}
            description={search ? "Probeer een andere zoekterm." : "Zodra er bedrijven worden aangemaakt, verschijnen ze hier."}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #e8e5df" }}>
                    <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Naam</th>
                    <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Status</th>
                    <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Locaties</th>
                    <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Patiënten</th>
                    <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Aangemaakt op</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedOrgs.map((org) => (
                    <tr
                      key={org.id}
                      onClick={() => router.push(`/admin/organisaties/${org.id}`)}
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                      style={{ borderBottom: "1px solid #f8f7f4" }}
                    >
                      <td className="px-5 py-3.5 font-medium text-gray-800">{org.name}</td>
                      <td className="px-5 py-3.5">{orgStatusBadge(org.status)}</td>
                      <td className="px-5 py-3.5 text-gray-600">{org.locationCount}</td>
                      <td className="px-5 py-3.5 text-gray-600">{org.patientCount}</td>
                      <td className="px-5 py-3.5 text-gray-400">{formatDate(org.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 flex-wrap gap-2" style={{ borderTop: "1px solid #f8f7f4" }}>
                <span className="text-xs text-gray-400">
                  Pagina {safePage} van {totalPages} — {filteredOrgs.length} {filteredOrgs.length === 1 ? "resultaat" : "resultaten"}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Vorige</Button>
                  <Button size="sm" variant="secondary" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>Volgende</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
