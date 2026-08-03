"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus, Search } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SortableHeader } from "@/components/ui/table/SortableHeader";
import { Pagination } from "@/components/ui/table/Pagination";
import { useTableState } from "@/components/ui/table/useTableState";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import {
  loadRevaProtocols, loadOrgProtocols, createProtocol, duplicateProtocol, updateProtocolArchived, deleteProtocol,
  MANAGE_PROTOCOLS_ROLES, INJURY_CATEGORY_LABELS,
  type PortalProtocolCard,
} from "@/lib/services/protocolService";

const inputStyle = { borderColor: "#e8e5df", background: "#ffffff", color: "#1a1a1a" };

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

function compareNullableStrings(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b, "nl");
}

type SortKey = "name" | "phaseCount" | "createdAt";

export default function PortalProtocolsPage() {
  const router = useRouter();
  const { checked, membership } = usePortalMembership();
  const [revaCards, setRevaCards] = useState<PortalProtocolCard[]>([]);
  const [orgCards, setOrgCards] = useState<PortalProtocolCard[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [creatorFilter, setCreatorFilter] = useState("");

  const [creatingDraft, setCreatingDraft] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PortalProtocolCard | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast, toastNode } = useToast();

  const canManage = !!membership && MANAGE_PROTOCOLS_ROLES.includes(membership.roleKey);

  function refresh(organizationId: string) {
    Promise.all([loadRevaProtocols(), loadOrgProtocols(organizationId)]).then(([reva, org]) => {
      setRevaCards(reva);
      setOrgCards(org);
      setLoading(false);
    });
  }

  useEffect(() => {
    if (!checked || !membership) return;
    let cancelled = false;
    Promise.all([loadRevaProtocols(), loadOrgProtocols(membership.organizationId)]).then(([reva, org]) => {
      if (cancelled) return;
      setRevaCards(reva);
      setOrgCards(org);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [checked, membership]);

  const allProtocols = useMemo(() => [...orgCards, ...revaCards], [orgCards, revaCards]);

  const creatorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of orgCards) if (c.createdBy) map.set(c.createdBy, c.createdByName ?? "Onbekend");
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "nl"));
  }, [orgCards]);

  const categoryOptions = useMemo(() => {
    const set = new Set(allProtocols.map((c) => c.injuryCategory));
    return [...set].sort((a, b) => (INJURY_CATEGORY_LABELS[a] ?? a).localeCompare(INJURY_CATEGORY_LABELS[b] ?? b, "nl"));
  }, [allProtocols]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allProtocols.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (statusFilter === "actief" && c.archived) return false;
      if (statusFilter === "gearchiveerd" && !c.archived) return false;
      if (sourceFilter && c.scope !== sourceFilter) return false;
      if (categoryFilter && c.injuryCategory !== categoryFilter) return false;
      if (creatorFilter && c.createdBy !== creatorFilter) return false;
      return true;
    });
  }, [allProtocols, search, statusFilter, sourceFilter, categoryFilter, creatorFilter]);

  const { sortKey, sortDir, handleSort, setSort, page, setPage, totalPages, paged } = useTableState<PortalProtocolCard, SortKey>(
    filtered,
    (a, b, key) =>
      key === "name" ? compareNullableStrings(a.name, b.name)
      : key === "phaseCount" ? a.phaseCount - b.phaseCount
      : a.createdAt.localeCompare(b.createdAt),
    "name",
    20,
    (key) => (key === "createdAt" ? "desc" : "asc")
  );

  async function handleCreateDraft() {
    if (!membership) return;
    setCreatingDraft(true);
    const { id, error } = await createProtocol(membership.organizationId, { name: "Nieuw herstelplan", description: "", injuryCategory: "custom" });
    setCreatingDraft(false);
    if (error || !id) { showToast(error ?? "Aanmaken is niet gelukt.", "error"); return; }
    router.push(`/portal/herstelplannen/${id}?draft=1`);
  }

  async function handleDuplicate(card: PortalProtocolCard) {
    if (!membership) return;
    const { error } = await duplicateProtocol(card.id, membership.organizationId);
    if (error) { showToast(error, "error"); return; }
    showToast("Herstelplan gedupliceerd naar eigen herstelplannen");
    refresh(membership.organizationId);
  }

  async function handleToggleArchived(card: PortalProtocolCard) {
    if (!membership) return;
    const nextArchived = !card.archived;
    const { error } = await updateProtocolArchived(card.id, nextArchived);
    if (error) { showToast(error, "error"); return; }
    showToast(nextArchived ? "Herstelplan gearchiveerd" : "Herstelplan gedearchiveerd");
    refresh(membership.organizationId);
  }

  async function handleConfirmDelete() {
    if (!confirmDelete || !membership) return;
    setDeleting(true);
    const { error } = await deleteProtocol(confirmDelete.id);
    setDeleting(false);
    if (error) { showToast(error, "error"); setConfirmDelete(null); return; }
    showToast("Herstelplan verwijderd");
    setConfirmDelete(null);
    refresh(membership.organizationId);
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <SectionHeader title="Herstelplannen" subtitle={loading ? "Laden…" : `${filtered.length} van ${allProtocols.length} ${allProtocols.length === 1 ? "herstelplan" : "herstelplannen"}`} />
        {canManage && (
          <Button size="sm" disabled={creatingDraft} onClick={handleCreateDraft}>
            <Plus size={14} /> {creatingDraft ? "Aanmaken…" : "Nieuw herstelplan"}
          </Button>
        )}
      </div>

      <div className="rounded-2xl border p-4 flex flex-wrap gap-3 items-end" style={{ background: "#ffffff", borderColor: "#e8e5df" }}>
        <div className="flex-1 min-w-[200px]">
          <FieldLabel>Zoeken</FieldLabel>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Naam…" className="w-full text-sm rounded-xl border pl-9 pr-3 py-2 focus:outline-none" style={inputStyle}
            />
          </div>
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-40">
          <FieldLabel>Status</FieldLabel>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
            <option value="">Alle</option>
            <option value="actief">Actief</option>
            <option value="gearchiveerd">Gearchiveerd</option>
          </select>
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-44">
          <FieldLabel>Bron</FieldLabel>
          <select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
            <option value="">Alle</option>
            <option value="organization">Eigen bibliotheek</option>
            <option value="reva">REVA-bibliotheek</option>
          </select>
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-48">
          <FieldLabel>Blessure / ingreep</FieldLabel>
          <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
            <option value="">Alle</option>
            {categoryOptions.map((key) => <option key={key} value={key}>{INJURY_CATEGORY_LABELS[key] ?? key}</option>)}
          </select>
        </div>
        {creatorOptions.length > 0 && (
          <div className="w-[calc(50%-0.375rem)] sm:w-48">
            <FieldLabel>Aangemaakt door</FieldLabel>
            <select value={creatorFilter} onChange={(e) => { setCreatorFilter(e.target.value); setPage(1); }} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
              <option value="">Alle</option>
              {creatorOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
        )}
        <div className="w-[calc(50%-0.375rem)] sm:w-44">
          <FieldLabel>Sorteren</FieldLabel>
          <select
            value={sortKey === "createdAt" && sortDir === "desc" ? "nieuwste" : sortKey === "phaseCount" ? "fases" : "naam"}
            onChange={(e) => {
              if (e.target.value === "nieuwste") setSort("createdAt", "desc");
              else if (e.target.value === "fases") setSort("phaseCount", "desc");
              else setSort("name", "asc");
            }}
            className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
          >
            <option value="naam">Naam (A-Z)</option>
            <option value="fases">Meeste fases</option>
            <option value="nieuwste">Nieuwste eerst</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {loading ? (
          <p className="text-sm text-gray-400 p-6">Laden…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={allProtocols.length === 0 ? "Nog geen herstelplannen" : "Geen herstelplannen gevonden"}
            description={allProtocols.length === 0 ? "Maak je eerste herstelplan aan om te beginnen." : "Pas de filters aan om meer resultaten te zien."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #e8e5df" }}>
                  <SortableHeader label="Herstelplan" sortKeyValue="name" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Blessure / ingreep</th>
                  <SortableHeader label="Fases" sortKeyValue="phaseCount" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Aangemaakt door</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Bron</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Status</th>
                  <th className="text-right font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Actie</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/portal/herstelplannen/${c.id}`)}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                    style={{ borderBottom: "1px solid #f8f7f4" }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#f8f7f4" }}>
                          <ClipboardList size={15} className="text-gray-400" />
                        </div>
                        <p className="font-medium text-gray-800 truncate">{c.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{INJURY_CATEGORY_LABELS[c.injuryCategory] ?? c.injuryCategory}</td>
                    <td className="px-5 py-3.5 text-gray-600">{c.phaseCount}</td>
                    <td className="px-5 py-3.5 text-gray-600">{c.createdByName ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {c.scope === "reva" ? <Badge variant="blue">REVA</Badge> : <Badge variant="default">Eigen</Badge>}
                        {c.scope === "reva" && !c.clinicallyReviewed && <Badge variant="warning">Nog niet gereviewd</Badge>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">{c.archived ? <Badge variant="muted">Gearchiveerd</Badge> : <Badge variant="success">Actief</Badge>}</td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      {canManage && (
                        <ActionMenu
                          items={
                            c.scope === "organization"
                              ? [
                                  { label: "Dupliceren", onClick: () => handleDuplicate(c) },
                                  { label: c.archived ? "Dearchiveren" : "Archiveren", onClick: () => handleToggleArchived(c) },
                                  ...(c.archived ? [{ label: "Verwijderen", onClick: () => setConfirmDelete(c), danger: true }] : []),
                                ]
                              : [{ label: "Dupliceren", onClick: () => handleDuplicate(c) }]
                          }
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} totalPages={totalPages} totalCount={filtered.length} itemLabel="resultaat" itemLabelPlural="resultaten" onPageChange={setPage} />
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Herstelplan verwijderen?"
          message={`"${confirmDelete.name}" wordt permanent verwijderd. Patiënten die dit herstelplan al toegewezen hadden gekregen behouden hun eigen kopie — alleen het sjabloon zelf verdwijnt.`}
          confirmLabel="Herstelplan verwijderen"
          loading={deleting}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
      {toastNode}
    </div>
  );
}
