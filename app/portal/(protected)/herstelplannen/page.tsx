"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus, Layers } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  loadRevaProtocols, loadOrgProtocols, createProtocol, duplicateProtocol, updateProtocolArchived, deleteProtocol,
  MANAGE_PROTOCOLS_ROLES, INJURY_CATEGORY_LABELS,
  type PortalProtocolCard, type PortalProtocolInput,
} from "@/lib/services/protocolService";

const inputStyle = { borderColor: "#e8e5df", background: "#ffffff", color: "#1a1a1a" };

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

function ProtocolCard({
  card, canManage, onOpen, onDuplicate, onToggleArchive, onDelete,
}: {
  card: PortalProtocolCard;
  canManage: boolean;
  onOpen: () => void;
  onDuplicate?: () => void;
  onToggleArchive?: () => void;
  onDelete?: () => void;
}) {
  return (
    <Card padding="none" hoverable className="overflow-visible">
      <div className="p-5 cursor-pointer" onClick={onOpen}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{card.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{INJURY_CATEGORY_LABELS[card.injuryCategory] ?? card.injuryCategory}</p>
          </div>
          {canManage && (onDuplicate || onToggleArchive || onDelete) && (
            <div onClick={(e) => e.stopPropagation()}>
              <ActionMenu
                items={[
                  ...(onDuplicate ? [{ label: "Dupliceren", onClick: onDuplicate }] : []),
                  ...(onToggleArchive ? [{ label: card.archived ? "Dearchiveren" : "Archiveren", onClick: onToggleArchive }] : []),
                  ...(onDelete ? [{ label: "Verwijderen", onClick: onDelete, danger: true }] : []),
                ]}
              />
            </div>
          )}
        </div>
        {card.description && <p className="text-xs text-gray-500 mb-4 line-clamp-2">{card.description}</p>}
        {card.scope === "organization" && (
          <p className="text-xs text-gray-400 mb-3">Gemaakt door {card.createdByName ?? "onbekend"}</p>
        )}
        {card.scope === "reva" && !card.clinicallyReviewed && (
          <p className="text-xs mb-3" style={{ color: "#b45309" }}>Nog niet klinisch gereviewd — nog niet toewijzen aan patiënten</p>
        )}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Layers size={12} /> {card.phaseCount} {card.phaseCount === 1 ? "fase" : "fases"}
          </span>
          <div className="flex items-center gap-1.5">
            {card.scope === "reva" && !card.clinicallyReviewed && <Badge variant="warning">Nog niet gereviewd</Badge>}
            {card.scope === "reva" ? (
              <Badge variant="blue">REVA</Badge>
            ) : card.archived ? (
              <Badge variant="muted">Gearchiveerd</Badge>
            ) : (
              <Badge variant="success">Actief</Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function PortalProtocolsPage() {
  const router = useRouter();
  const { checked, membership } = usePortalMembership();
  const [revaCards, setRevaCards] = useState<PortalProtocolCard[]>([]);
  const [orgCards, setOrgCards] = useState<PortalProtocolCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "archived">("active");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [creatorFilter, setCreatorFilter] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [newInput, setNewInput] = useState<PortalProtocolInput>({ name: "", description: "", injuryCategory: "custom" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
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

  const creatorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of orgCards) {
      if (c.createdBy) map.set(c.createdBy, c.createdByName ?? "Onbekend");
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "nl"));
  }, [orgCards]);

  const categoryOptions = useMemo(() => {
    const set = new Set(orgCards.map((c) => c.injuryCategory));
    return [...set].sort((a, b) => (INJURY_CATEGORY_LABELS[a] ?? a).localeCompare(INJURY_CATEGORY_LABELS[b] ?? b, "nl"));
  }, [orgCards]);

  const visibleOrgCards = orgCards.filter((c) => {
    if (filter === "active" && c.archived) return false;
    if (filter === "archived" && !c.archived) return false;
    if (categoryFilter && c.injuryCategory !== categoryFilter) return false;
    if (creatorFilter && c.createdBy !== creatorFilter) return false;
    return true;
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!membership || !newInput.name.trim()) return;
    setCreating(true);
    setCreateError("");
    const { id, error } = await createProtocol(membership.organizationId, newInput);
    setCreating(false);
    if (error || !id) { setCreateError(error ?? "Aanmaken is niet gelukt."); return; }
    setShowCreate(false);
    setNewInput({ name: "", description: "", injuryCategory: "custom" });
    router.push(`/portal/herstelplannen/${id}`);
  }

  async function handleDuplicate(protocolId: string) {
    if (!membership) return;
    setBusyId(protocolId);
    const { error } = await duplicateProtocol(protocolId, membership.organizationId);
    setBusyId(null);
    if (error) { showToast(error, "error"); return; }
    showToast("Herstelplan gedupliceerd naar eigen herstelplannen");
    refresh(membership.organizationId);
  }

  async function handleToggleArchive(card: PortalProtocolCard) {
    if (!membership) return;
    setBusyId(card.id);
    const nextArchived = !card.archived;
    const { error } = await updateProtocolArchived(card.id, nextArchived);
    setBusyId(null);
    if (error) { showToast(error, "error"); return; }
    showToast(nextArchived ? "Herstelplan gearchiveerd" : "Herstelplan gedearchiveerd");
    refresh(membership.organizationId);
  }

  async function handleConfirmDelete() {
    if (!confirmDelete || !membership) return;
    setDeleting(true);
    const { error } = await deleteProtocol(confirmDelete.id);
    setDeleting(false);
    setConfirmDelete(null);
    if (error) { showToast(error, "error"); return; }
    showToast("Herstelplan verwijderd");
    refresh(membership.organizationId);
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <SectionHeader title="Herstelplannen" subtitle="Herstelplannen die je aan patiënten kunt toewijzen" />
        {canManage && (
          <Button size="sm" onClick={() => { setCreateError(""); setShowCreate(true); }}>
            <Plus size={14} /> Nieuw herstelplan
          </Button>
        )}
      </div>

      {showCreate && membership && (
        <Modal onClose={() => setShowCreate(false)} maxWidth="max-w-md" dismissOnBackdropClick={false}>
          <div className="rounded-2xl p-6" style={{ background: "#ffffff" }}>
            <h3 className="font-semibold text-gray-900 mb-4">Nieuw herstelplan</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <FieldLabel>Naam</FieldLabel>
                <input
                  type="text" value={newInput.name} onChange={(e) => setNewInput((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Bijv. ACL-revalidatie 2026" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
                />
              </div>
              <div>
                <FieldLabel>Blessure / ingreep</FieldLabel>
                <select
                  value={newInput.injuryCategory} onChange={(e) => setNewInput((p) => ({ ...p, injuryCategory: e.target.value }))}
                  className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
                >
                  {Object.entries(INJURY_CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Omschrijving (optioneel)</FieldLabel>
                <textarea
                  value={newInput.description} onChange={(e) => setNewInput((p) => ({ ...p, description: e.target.value }))}
                  rows={2} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none resize-none" style={inputStyle}
                />
              </div>
              {createError && <p className="text-xs" style={{ color: "#dc2626" }}>{createError}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => setShowCreate(false)}>Annuleren</Button>
                <Button type="submit" size="sm" disabled={creating || !newInput.name.trim()}>
                  {creating ? "Aanmaken…" : "Herstelplan aanmaken"}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Laden…</p>
      ) : (
        <>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">REVA-herstelplannen</h3>
            {revaCards.length === 0 ? (
              <EmptyState icon={ClipboardList} title="Nog geen REVA-standaard herstelplannen beschikbaar" description="Deze worden later toegevoegd." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {revaCards.map((card) => (
                  <ProtocolCard
                    key={card.id}
                    card={card}
                    canManage={canManage}
                    onOpen={() => router.push(`/portal/herstelplannen/${card.id}`)}
                    onDuplicate={canManage ? () => handleDuplicate(card.id) : undefined}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-sm font-semibold text-gray-700">Eigen herstelplannen</h3>
              <div className="flex rounded-xl overflow-hidden w-fit" style={{ background: "#f3f0eb" }}>
                {(["active", "archived"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="px-4 py-2 text-sm font-medium transition-all"
                    style={{
                      background: filter === f ? "#ffffff" : "transparent",
                      color: filter === f ? "#1a1a1a" : "#9ca3af",
                      borderRadius: "10px", margin: "3px",
                      boxShadow: filter === f ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                    }}
                  >
                    {f === "active" ? "Actief" : "Gearchiveerd"}
                  </button>
                ))}
              </div>
            </div>

            {orgCards.length > 0 && (
              <div className="flex flex-wrap gap-3">
                <div className="w-[calc(50%-0.375rem)] sm:w-52">
                  <select
                    value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
                  >
                    <option value="">Alle categorieën</option>
                    {categoryOptions.map((key) => <option key={key} value={key}>{INJURY_CATEGORY_LABELS[key] ?? key}</option>)}
                  </select>
                </div>
                {creatorOptions.length > 0 && (
                  <div className="w-[calc(50%-0.375rem)] sm:w-52">
                    <select
                      value={creatorFilter} onChange={(e) => setCreatorFilter(e.target.value)}
                      className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
                    >
                      <option value="">Alle fysio&apos;s</option>
                      {creatorOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            {visibleOrgCards.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title={
                  categoryFilter || creatorFilter
                    ? "Geen herstelplannen gevonden"
                    : filter === "active" ? "Nog geen eigen herstelplannen" : "Geen gearchiveerde herstelplannen"
                }
                description={
                  categoryFilter || creatorFilter
                    ? "Pas de filters aan om meer resultaten te zien."
                    : filter === "active" ? "Maak een nieuw herstelplan of dupliceer een REVA-herstelplan om te beginnen." : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleOrgCards.map((card) => (
                  <ProtocolCard
                    key={card.id}
                    card={card}
                    canManage={canManage}
                    onOpen={() => router.push(`/portal/herstelplannen/${card.id}`)}
                    onDuplicate={canManage && busyId !== card.id ? () => handleDuplicate(card.id) : undefined}
                    onToggleArchive={canManage && busyId !== card.id ? () => handleToggleArchive(card) : undefined}
                    onDelete={canManage && card.archived && busyId !== card.id ? () => setConfirmDelete(card) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

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
