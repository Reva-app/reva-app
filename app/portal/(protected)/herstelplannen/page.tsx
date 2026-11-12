"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pagination } from "@/components/ui/table/Pagination";
import { useTableState } from "@/components/ui/table/useTableState";
import { ResponsiveList, type ListColumn } from "@/components/ui/ResponsiveList";
import { FilterBar } from "@/components/ui/FilterBar";
import { Field, Select } from "@/components/ui/Field";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import {
  loadRevaProtocols, loadOrgProtocols, createProtocol, duplicateProtocol, updateProtocolArchived, deleteProtocol,
  MANAGE_PROTOCOLS_ROLES, INJURY_CATEGORY_LABELS,
  type PortalProtocolCard,
} from "@/lib/services/protocolService";

function compareNullableStrings(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b, "nl");
}

type SortKey = "name" | "phaseCount" | "createdAt";

const SORT_OPTIONS: { key: SortKey; dir: "asc" | "desc"; label: string }[] = [
  { key: "name", dir: "asc", label: "Naam (A-Z)" },
  { key: "name", dir: "desc", label: "Naam (Z-A)" },
  { key: "phaseCount", dir: "desc", label: "Meeste fases" },
  { key: "createdAt", dir: "desc", label: "Nieuwste eerst" },
];

function sourceBadges(c: PortalProtocolCard) {
  return (
    <>
      {c.scope === "reva" ? <Badge variant="blue">REVA</Badge> : <Badge variant="default">Eigen</Badge>}
      {c.scope === "reva" && !c.clinicallyReviewed && <Badge variant="warning">Nog niet gereviewd</Badge>}
    </>
  );
}

function statusBadge(c: PortalProtocolCard) {
  return c.archived ? <Badge variant="muted">Gearchiveerd</Badge> : <Badge variant="success">Actief</Badge>;
}

function categoryLabel(c: PortalProtocolCard) {
  return INJURY_CATEGORY_LABELS[c.injuryCategory] ?? c.injuryCategory;
}

function ProtocolIcon() {
  return (
    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#f8f7f4" }}>
      <ClipboardList size={15} className="text-gray-400" aria-hidden />
    </div>
  );
}

const PROTOCOL_COLUMNS: ListColumn<PortalProtocolCard, SortKey>[] = [
  {
    key: "name", header: "Herstelplan", sortKey: "name",
    cell: (c) => (
      <div className="flex items-center gap-3 min-w-[260px]">
        <ProtocolIcon />
        <div className="min-w-0">
          <p className="font-medium text-gray-900 [overflow-wrap:anywhere]">{c.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{categoryLabel(c)}</p>
        </div>
      </div>
    ),
  },
  { key: "phaseCount", header: "Fases", sortKey: "phaseCount", className: "text-gray-600", cell: (c) => c.phaseCount },
  {
    key: "source", header: "Bron",
    cell: (c) => (
      <div className="whitespace-nowrap">
        {c.scope === "reva" ? <Badge variant="blue">REVA</Badge> : <Badge variant="default">Eigen</Badge>}
        {c.scope !== "reva" && c.createdByName && <p className="text-xs text-gray-400 mt-1">{c.createdByName}</p>}
      </div>
    ),
  },
  { key: "status", header: "Status", cell: statusBadge },
];

/** Kaart op telefoon: de volledige naam, waarvoor het plan is en waar het vandaan komt. */
function ProtocolCard({ protocol: c }: { protocol: PortalProtocolCard }) {
  const details = [categoryLabel(c), `${c.phaseCount} ${c.phaseCount === 1 ? "fase" : "fases"}`, c.createdByName].filter(Boolean).join(" · ");
  return (
    <div className="flex items-start gap-3">
      <ProtocolIcon />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900 leading-snug [overflow-wrap:anywhere]">{c.name}</p>
        <p className="text-xs text-gray-500 mt-1">{details}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {sourceBadges(c)}
          {c.archived && statusBadge(c)}
        </div>
      </div>
    </div>
  );
}

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

  const activeFilterCount = [statusFilter, sourceFilter, categoryFilter, creatorFilter].filter(Boolean).length;
  function resetFilters() {
    setStatusFilter(""); setSourceFilter(""); setCategoryFilter(""); setCreatorFilter("");
    setPage(1);
  }

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

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Naam…"
        activeCount={activeFilterCount}
        onReset={resetFilters}
        resultCount={filtered.length}
      >
        <Field label="Status" className="md:w-40">
          <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">Alle</option>
            <option value="actief">Actief</option>
            <option value="gearchiveerd">Gearchiveerd</option>
          </Select>
        </Field>
        <Field label="Bron" className="md:w-44">
          <Select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}>
            <option value="">Alle</option>
            <option value="organization">Eigen bibliotheek</option>
            <option value="reva">REVA-bibliotheek</option>
          </Select>
        </Field>
        <Field label="Blessure / ingreep" className="md:w-48">
          <Select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
            <option value="">Alle</option>
            {categoryOptions.map((key) => <option key={key} value={key}>{INJURY_CATEGORY_LABELS[key] ?? key}</option>)}
          </Select>
        </Field>
        {creatorOptions.length > 0 && (
          <Field label="Aangemaakt door" className="md:w-48">
            <Select value={creatorFilter} onChange={(e) => { setCreatorFilter(e.target.value); setPage(1); }}>
              <option value="">Alle</option>
              {creatorOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </Select>
          </Field>
        )}
      </FilterBar>

      <div className="rounded-2xl border overflow-hidden" style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {loading ? (
          <p className="text-sm text-gray-500 p-6">Laden…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={allProtocols.length === 0 ? "Nog geen herstelplannen" : "Geen herstelplannen gevonden"}
            description={allProtocols.length === 0 ? "Maak je eerste herstelplan aan om te beginnen." : "Pas de filters aan om meer resultaten te zien."}
          />
        ) : (
          <ResponsiveList
            rows={paged}
            rowKey={(c) => c.id}
            rowLabel={(c) => c.name}
            onRowClick={(c) => router.push(`/portal/herstelplannen/${c.id}`)}
            columns={PROTOCOL_COLUMNS}
            card={(c) => <ProtocolCard protocol={c} />}
            actions={canManage ? (c) =>
              c.scope === "organization"
                ? [
                    { label: "Dupliceren", onClick: () => handleDuplicate(c) },
                    { label: c.archived ? "Dearchiveren" : "Archiveren", onClick: () => handleToggleArchived(c) },
                    ...(c.archived ? [{ label: "Verwijderen", onClick: () => setConfirmDelete(c), danger: true }] : []),
                  ]
                : [{ label: "Dupliceren", onClick: () => handleDuplicate(c) }]
              : undefined}
            sort={{ key: sortKey, dir: sortDir, onSort: handleSort, onSet: setSort, options: SORT_OPTIONS }}
          />
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
