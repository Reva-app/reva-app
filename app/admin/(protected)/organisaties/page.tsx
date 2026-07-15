"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, Loader2 } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/data";
import { loadAdminOrganizations, createAdminOrganization, type AdminOrganization } from "@/lib/services/adminService";

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
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
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
      setCreateError("Vul een organisatienaam in");
      return;
    }
    setCreating(true);
    setCreateError("");
    const { id, error } = await createAdminOrganization(newName.trim());
    setCreating(false);
    if (error || !id) {
      setCreateError(error || "Aanmaken is niet gelukt");
      return;
    }
    router.push(`/admin/organisaties/${id}`);
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <SectionHeader
          title="Organisaties"
          subtitle={loading ? "Laden…" : `${orgs.length} ${orgs.length === 1 ? "organisatie" : "organisaties"} op het platform`}
        />
        <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
          <Plus size={14} />
          Nieuwe organisatie
        </Button>
      </div>

      {showCreate && (
        <div
          className="rounded-2xl border p-5"
          style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <form onSubmit={handleCreate} className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Organisatienaam</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Bijv. Fysiotherapie Voorbeeldpraktijk"
                className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none"
                style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }}
              />
            </div>
            <Button type="submit" size="sm" disabled={creating}>
              {creating ? <Loader2 size={14} className="animate-spin" /> : "Aanmaken"}
            </Button>
          </form>
          {createError && <p className="text-xs mt-2" style={{ color: "#dc2626" }}>{createError}</p>}
          <p className="text-xs text-gray-400 mt-2">
            Maakt de organisatie aan met status &ldquo;Trial&rdquo; en één standaardvestiging (&ldquo;Hoofdlocatie&rdquo;).
          </p>
        </div>
      )}

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
        )}
      </div>
    </div>
  );
}
