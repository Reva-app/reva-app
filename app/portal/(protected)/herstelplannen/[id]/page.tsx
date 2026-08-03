"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronRight, ChevronUp, Plus, Trash2, Layers } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import {
  loadProtocolDetail, updateProtocol, updateProtocolName, updateProtocolArchived, deleteProtocol, duplicateProtocol,
  createProtocolPhase, deleteProtocolPhase, reorderProtocolPhases,
  MANAGE_PROTOCOLS_ROLES, INJURY_CATEGORY_LABELS,
  type PortalProtocolDetail,
} from "@/lib/services/protocolService";

const inputStyle = { borderColor: "#e8e5df", background: "#ffffff", color: "#1a1a1a" };

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

// Titel waarmee "Nieuw herstelplan" een nieuw concept aanmaakt (herstelplannen/page.tsx)
// — moet exact hiermee overeenkomen zodat de leeg-conceptcheck hieronder klopt.
const DRAFT_TITLE = "Nieuw herstelplan";

export default function PortalProtocolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const protocolId = params.id as string;
  const { checked, membership } = usePortalMembership();

  const [protocol, setProtocol] = useState<PortalProtocolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [injuryCategory, setInjuryCategory] = useState("custom");
  const [savingDescription, setSavingDescription] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [creatingPhaseDraft, setCreatingPhaseDraft] = useState(false);
  const [confirmDeletePhaseId, setConfirmDeletePhaseId] = useState<string | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmDeleteProtocol, setConfirmDeleteProtocol] = useState(false);
  const [deletingProtocol, setDeletingProtocol] = useState(false);
  const { showToast, toastNode } = useToast();

  const canManage = !!membership && MANAGE_PROTOCOLS_ROLES.includes(membership.roleKey);
  const canEdit = canManage && protocol?.scope === "organization";

  // Ruimt een net aangemaakt, nog leeg conceptherstelplan automatisch op zodra
  // de gebruiker wegnavigeert zonder iets in te vullen — zelfde aanpak als
  // schemas/[id]/page.tsx en oefeningen/[id]/page.tsx (zie de toelichting daar).
  const isDraftRef = useRef(searchParams.get("draft") === "1");
  const draftSnapshotRef = useRef({ name, description, phaseCount: 0 });
  const cleanupTokenRef = useRef(0);
  useEffect(() => {
    draftSnapshotRef.current = { name, description, phaseCount: protocol?.phases.length ?? 0 };
  });
  useEffect(() => {
    const myToken = ++cleanupTokenRef.current;
    return () => {
      setTimeout(() => {
        // eslint-disable-next-line react-hooks/exhaustive-deps -- bewust: we willen de actuele ref-waarde op het moment van de timeout, niet een momentopname
        if (cleanupTokenRef.current !== myToken) return; // Strict Mode dubbele aanroep, geen echte unmount
        // eslint-disable-next-line react-hooks/exhaustive-deps
        if (!isDraftRef.current) return;
        const snap = draftSnapshotRef.current;
        if (snap.name.trim() === DRAFT_TITLE && !snap.description.trim() && snap.phaseCount === 0) {
          deleteProtocol(protocolId);
        }
      }, 0);
    };
  }, [protocolId]);

  function refresh() {
    loadProtocolDetail(protocolId).then((data) => {
      setProtocol(data);
      setNotFound(!data);
      if (data) {
        setName(data.name);
        setDescription(data.description ?? "");
        setInjuryCategory(data.injuryCategory);
      }
      setLoading(false);
    });
  }

  useEffect(() => {
    if (!checked || !membership) return;
    let cancelled = false;
    loadProtocolDetail(protocolId).then((data) => {
      if (cancelled) return;
      setProtocol(data);
      setNotFound(!data);
      if (data) {
        setName(data.name);
        setDescription(data.description ?? "");
        setInjuryCategory(data.injuryCategory);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [checked, membership, protocolId]);

  function handleTitleBlur() {
    const next = name.trim();
    if (!next || !protocol || next === protocol.name) return;
    updateProtocolName(protocolId, next).then(({ error }) => {
      if (error) { showToast(error, "error"); return; }
      setProtocol((prev) => (prev ? { ...prev, name: next } : prev));
      showToast("Titel opgeslagen");
    });
  }

  async function handleSaveDescription() {
    setSavingDescription(true);
    const { error } = await updateProtocol(protocolId, { name, description, injuryCategory });
    setSavingDescription(false);
    if (error) { showToast(error, "error"); return; }
    showToast("Opgeslagen");
    refresh();
  }

  async function handleToggleArchived() {
    if (!protocol) return;
    const nextArchived = !protocol.archived;
    const { error } = await updateProtocolArchived(protocol.id, nextArchived);
    if (error) { showToast(error, "error"); return; }
    showToast(nextArchived ? "Herstelplan gearchiveerd" : "Herstelplan gedearchiveerd");
    refresh();
  }

  async function handleConfirmDeleteProtocol() {
    if (!protocol) return;
    setDeletingProtocol(true);
    const { error } = await deleteProtocol(protocol.id);
    setDeletingProtocol(false);
    setConfirmDeleteProtocol(false);
    if (error) { showToast(error, "error"); return; }
    router.push("/portal/herstelplannen");
  }

  async function handleDuplicate() {
    if (!membership || !protocol) return;
    setDuplicating(true);
    const { id, error } = await duplicateProtocol(protocol.id, membership.organizationId);
    setDuplicating(false);
    if (error || !id) { showToast(error ?? "Dupliceren is niet gelukt.", "error"); return; }
    showToast("Eigen kopie aangemaakt");
    router.push(`/portal/herstelplannen/${id}`);
  }

  async function handleMovePhase(phaseId: string, direction: -1 | 1) {
    if (!protocol) return;
    const ids = protocol.phases.map((p) => p.id);
    const index = ids.indexOf(phaseId);
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= ids.length) return;
    [ids[index], ids[swapWith]] = [ids[swapWith], ids[index]];
    await reorderProtocolPhases(ids);
    refresh();
  }

  async function handleCreatePhaseDraft() {
    if (!protocol) return;
    setCreatingPhaseDraft(true);
    const { id, error } = await createProtocolPhase(
      protocol.id,
      { name: "Nieuwe fase", description: "", therapistNotes: "", weekRangeLabel: "", forbiddenActivities: [] },
      protocol.phases.length
    );
    setCreatingPhaseDraft(false);
    if (error || !id) { showToast(error ?? "Aanmaken is niet gelukt.", "error"); return; }
    router.push(`/portal/herstelplannen/${protocolId}/fases/${id}?draft=1`);
  }

  async function handleDeletePhase() {
    if (!confirmDeletePhaseId) return;
    setConfirmBusy(true);
    const { error } = await deleteProtocolPhase(confirmDeletePhaseId);
    setConfirmBusy(false);
    setConfirmDeletePhaseId(null);
    if (error) { showToast(error, "error"); return; }
    showToast("Fase verwijderd");
    refresh();
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <button type="button" onClick={() => router.push("/portal/herstelplannen")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={14} /> Terug naar herstelplannen
      </button>

      {loading ? (
        <p className="text-sm text-gray-400">Laden…</p>
      ) : notFound || !protocol ? (
        <p className="text-sm text-gray-400">Dit herstelplan is niet gevonden.</p>
      ) : (
        <>
          <div className="flex items-start gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-900">{name || protocol.name}</h2>
            <div className="flex items-center gap-2 pt-0.5">
              {protocol.scope === "reva" ? <Badge variant="blue">REVA</Badge> : <Badge variant="default">Eigen</Badge>}
              {protocol.scope === "reva" && !protocol.clinicallyReviewed && <Badge variant="warning">Nog niet gereviewd</Badge>}
              {protocol.archived ? <Badge variant="muted">Gearchiveerd</Badge> : <Badge variant="success">Actief</Badge>}
            </div>
          </div>

          {protocol.scope === "reva" && !protocol.clinicallyReviewed && (
            <p className="text-sm rounded-xl p-3" style={{ background: "#fffbeb", color: "#b45309" }}>
              Dit REVA-herstelplan is nog niet door een fysiotherapeut klinisch gereviewd. Wijs dit herstelplan nog niet toe aan patiënten — dupliceer het naar je eigen bibliotheek zodra je de inhoud hebt gecontroleerd.
            </p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
            <div className="space-y-6 min-w-0">
              <Card>
                <CardHeader title="Titel" />
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)} onBlur={handleTitleBlur}
                  disabled={!canEdit}
                  className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60"
                  style={inputStyle}
                />
              </Card>

              <Card>
                <CardHeader title="Omschrijving" />
                <div className="space-y-4">
                  <div>
                    <FieldLabel>Blessure / ingreep</FieldLabel>
                    <select value={injuryCategory} onChange={(e) => setInjuryCategory(e.target.value)} disabled={!canEdit} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60" style={inputStyle}>
                      {Object.entries(INJURY_CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Omschrijving (optioneel)</FieldLabel>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} rows={3}
                      className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60 resize-none" style={inputStyle} />
                  </div>
                  {canEdit && <Button size="sm" disabled={savingDescription} onClick={handleSaveDescription}>{savingDescription ? "Opslaan…" : "Opslaan"}</Button>}
                </div>
              </Card>
            </div>

            <div className="space-y-6 min-w-0">
              <Card>
                <CardHeader title="Status" />
                <div className="space-y-3">
                  {protocol.archived ? <Badge variant="muted">Gearchiveerd</Badge> : <Badge variant="success">Actief</Badge>}
                  {canEdit && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={handleToggleArchived}>{protocol.archived ? "Dearchiveren" : "Archiveren"}</Button>
                      {protocol.archived && (
                        <Button size="sm" variant="secondary" onClick={() => setConfirmDeleteProtocol(true)}>Verwijderen</Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              <Card>
                <CardHeader title="Bron" />
                <div className="space-y-3">
                  {protocol.scope === "reva" ? <Badge variant="blue">REVA-bibliotheek</Badge> : <Badge variant="default">Eigen bibliotheek</Badge>}
                  {protocol.scope === "reva" && (
                    <>
                      <p className="text-xs text-gray-500">
                        Dit is een REVA-standaardherstelplan en kan hier niet bewerkt worden. Dupliceer het herstelplan om een eigen, bewerkbare kopie aan te maken.
                      </p>
                      <Button size="sm" disabled={duplicating} onClick={handleDuplicate}>{duplicating ? "Dupliceren…" : "Dupliceren"}</Button>
                    </>
                  )}
                </div>
              </Card>

              <Card>
                <CardHeader title="Gegevens" />
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Aangemaakt op</p>
                    <p className="text-gray-700">{fmtDate(protocol.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Aangemaakt door</p>
                    <p className="text-gray-700">{protocol.createdByName ?? "Onbekend"}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <Card padding="none">
            <div className="p-5 pb-4">
              <CardHeader
                title="Fases"
                action={canEdit ? <Button size="sm" disabled={creatingPhaseDraft} onClick={handleCreatePhaseDraft}><Plus size={14} /> {creatingPhaseDraft ? "Aanmaken…" : "Fase toevoegen"}</Button> : undefined}
              />
            </div>
            {protocol.phases.length === 0 ? (
              <div className="px-5 pb-5">
                <EmptyState icon={Layers} title="Nog geen fases" description={canEdit ? "Voeg de eerste fase toe om te beginnen." : undefined} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e8e5df" }}>
                      <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Fase</th>
                      <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Week</th>
                      <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Criteria</th>
                      <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Mijlpalen</th>
                      <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Schema&apos;s</th>
                      <th className="text-right font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Actie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {protocol.phases.map((phase, index) => (
                      <tr
                        key={phase.id}
                        onClick={() => router.push(`/portal/herstelplannen/${protocolId}/fases/${phase.id}`)}
                        className="cursor-pointer transition-colors hover:bg-gray-50"
                        style={{ borderBottom: "1px solid #f8f7f4" }}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg text-xs font-semibold shrink-0" style={{ background: "#f8f7f4", color: "#8a847d" }}>
                              {index + 1}
                            </div>
                            <p className="font-medium text-gray-800 truncate">{phase.name}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500">{phase.weekRangeLabel || "—"}</td>
                        <td className="px-5 py-3.5 text-gray-600">{phase.criteria.length}</td>
                        <td className="px-5 py-3.5 text-gray-600">{phase.milestones.length}</td>
                        <td className="px-5 py-3.5 text-gray-600">{phase.schedules.length}</td>
                        <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {canEdit && (
                              <>
                                <button type="button" onClick={() => handleMovePhase(phase.id, -1)} disabled={index === 0} title="Naar boven verplaatsen" className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-400">
                                  <ChevronUp size={14} />
                                </button>
                                <button type="button" onClick={() => handleMovePhase(phase.id, 1)} disabled={index === protocol.phases.length - 1} title="Naar beneden verplaatsen" className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-400">
                                  <ChevronDown size={14} />
                                </button>
                                <button type="button" onClick={() => setConfirmDeletePhaseId(phase.id)} title="Fase verwijderen" className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-gray-50 transition-colors">
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                            <ChevronRight size={16} className="text-gray-300 ml-1" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {confirmDeletePhaseId && (
        <ConfirmDialog
          title="Fase verwijderen?"
          message="Deze fase inclusief alle criteria, mijlpalen, educatie en schema's wordt permanent verwijderd."
          confirmLabel="Verwijderen"
          loading={confirmBusy}
          onCancel={() => setConfirmDeletePhaseId(null)}
          onConfirm={handleDeletePhase}
        />
      )}

      {confirmDeleteProtocol && (
        <ConfirmDialog
          title="Herstelplan verwijderen?"
          message="Dit herstelplan wordt permanent verwijderd, inclusief alle fases, criteria, mijlpalen en educatie. Patiënten die dit herstelplan al toegewezen hadden gekregen behouden hun eigen kopie."
          confirmLabel="Herstelplan verwijderen"
          loading={deletingProtocol}
          onCancel={() => setConfirmDeleteProtocol(false)}
          onConfirm={handleConfirmDeleteProtocol}
        />
      )}
      {toastNode}
    </div>
  );
}
