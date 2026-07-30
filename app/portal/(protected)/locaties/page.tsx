"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus, Star, Users, HeartPulse } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { LocationForm } from "@/components/portal/LocationForm";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import {
  loadPortalLocationCards, loadPortalMaxLocations, loadPortalLocationFull,
  setPortalMainLocation, updatePortalLocationArchived, deletePortalLocationChecked,
  summarizeOpeningHours, MANAGE_LOCATIONS_ROLES,
  type PortalLocationCard, type PortalLocationFull,
} from "@/lib/services/portalService";

type FormTarget = "new" | PortalLocationFull;

function formatAddress(card: PortalLocationCard): string | null {
  const parts = [card.street && card.houseNumber ? `${card.street} ${card.houseNumber}` : card.street, card.city].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function LocationCard({
  card, canManage, onOpen, onEdit, onSetMain, onToggleArchive, onDeleteRequest,
}: {
  card: PortalLocationCard;
  canManage: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onSetMain: () => void;
  onToggleArchive: () => void;
  onDeleteRequest: () => void;
}) {
  return (
    <Card padding="none" hoverable className="overflow-visible">
      <div className="p-5 cursor-pointer" onClick={onOpen}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-gray-900 truncate">{card.name}</h3>
              {card.isMainLocation && (
                <Badge variant="accent" className="flex items-center gap-1 shrink-0">
                  <Star size={10} /> Hoofdlocatie
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{formatAddress(card) || "Geen adres ingesteld"}</p>
          </div>
          {canManage && (
            <div onClick={(e) => e.stopPropagation()}>
              <ActionMenu
                items={[
                  { label: "Bewerken", onClick: onEdit },
                  ...(!card.isMainLocation ? [{ label: "Hoofdlocatie maken", onClick: onSetMain }] : []),
                  { label: card.archived ? "Dearchiveren" : "Archiveren", onClick: onToggleArchive },
                  { label: "Verwijderen", onClick: onDeleteRequest, danger: true },
                ]}
              />
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 mb-4">{summarizeOpeningHours(card.openingHours)}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Users size={12} /> {card.employeeCount}</span>
            <span className="flex items-center gap-1"><HeartPulse size={12} /> {card.patientCount}</span>
          </div>
          {card.archived ? <Badge variant="muted">Gearchiveerd</Badge> : <Badge variant="success">Actief</Badge>}
        </div>
      </div>
    </Card>
  );
}

export default function PortalLocationsPage() {
  const router = useRouter();
  const { checked, membership } = usePortalMembership();
  const [cards, setCards] = useState<PortalLocationCard[]>([]);
  const [maxLocations, setMaxLocations] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "archived">("active");

  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [confirmMainId, setConfirmMainId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { showToast, toastNode } = useToast();

  const canManage = !!membership && MANAGE_LOCATIONS_ROLES.includes(membership.roleKey);

  async function refresh(organizationId: string) {
    const [cardsData, max] = await Promise.all([
      loadPortalLocationCards(organizationId),
      loadPortalMaxLocations(organizationId),
    ]);
    setCards(cardsData);
    setMaxLocations(max);
    setLoading(false);
  }

  useEffect(() => {
    if (!checked || !membership) return;
    let cancelled = false;
    Promise.all([
      loadPortalLocationCards(membership.organizationId),
      loadPortalMaxLocations(membership.organizationId),
    ]).then(([cardsData, max]) => {
      if (cancelled) return;
      setCards(cardsData);
      setMaxLocations(max);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [checked, membership]);

  const activeCount = cards.filter((c) => !c.archived).length;
  const atLimit = maxLocations > 0 && activeCount >= maxLocations;
  const visibleCards = cards.filter((c) => (filter === "active" ? !c.archived : c.archived));

  async function handleEdit(locationId: string) {
    const full = await loadPortalLocationFull(locationId);
    if (full) setFormTarget(full);
  }

  async function handleSetMain() {
    if (!confirmMainId || !membership) return;
    setBusyId(confirmMainId);
    const { error } = await setPortalMainLocation(confirmMainId);
    setBusyId(null);
    setConfirmMainId(null);
    if (error) { showToast(error, "error"); return; }
    showToast("Hoofdlocatie gewijzigd");
    refresh(membership.organizationId);
  }

  async function handleToggleArchive(card: PortalLocationCard) {
    if (!membership) return;
    setBusyId(card.id);
    const nextArchived = !card.archived;
    const { error } = await updatePortalLocationArchived(card.id, nextArchived);
    setBusyId(null);
    if (error) { showToast(error, "error"); return; }
    showToast(nextArchived ? "Locatie gearchiveerd" : "Locatie gedearchiveerd");
    refresh(membership.organizationId);
  }

  async function handleDelete() {
    if (!confirmDeleteId || !membership) return;
    setBusyId(confirmDeleteId);
    const { error } = await deletePortalLocationChecked(confirmDeleteId);
    setBusyId(null);
    setConfirmDeleteId(null);
    if (error) { showToast(error, "error"); return; }
    showToast("Locatie verwijderd");
    refresh(membership.organizationId);
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <SectionHeader title="Locaties" subtitle={loading ? "Laden…" : `${activeCount} van ${maxLocations} locaties gebruikt`} />
        {canManage && (
          <Button size="sm" onClick={() => setFormTarget("new")} disabled={atLimit}>
            <Plus size={14} />
            Locatie toevoegen
          </Button>
        )}
      </div>

      {!loading && atLimit && (
        <p className="text-xs" style={{ color: "#dc2626" }}>
          Je hebt het maximum aantal locaties voor je abonnement bereikt. Neem contact op om uit te breiden.
        </p>
      )}

      <div className="flex rounded-xl overflow-hidden w-fit" style={{ background: "#f3f0eb" }}>
        {(["active", "archived"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-2 text-sm font-medium transition-all"
            style={{
              background: filter === f ? "#ffffff" : "transparent",
              color: filter === f ? "#1a1a1a" : "#9ca3af",
              borderRadius: "10px",
              margin: "3px",
              boxShadow: filter === f ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {f === "active" ? "Actief" : "Gearchiveerd"}
          </button>
        ))}
      </div>

      {formTarget && membership && (
        <Modal onClose={() => setFormTarget(null)} maxWidth="max-w-2xl" dismissOnBackdropClick={false}>
          <LocationForm
            organizationId={membership.organizationId}
            location={formTarget === "new" ? undefined : formTarget}
            onSaved={() => { setFormTarget(null); refresh(membership.organizationId); showToast("Locatie opgeslagen"); }}
            onClose={() => setFormTarget(null)}
          />
        </Modal>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Laden…</p>
      ) : visibleCards.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={filter === "active" ? "Nog geen actieve locaties" : "Geen gearchiveerde locaties"}
          description={filter === "active" ? "Voeg je eerste locatie toe om te beginnen." : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCards.map((card) => (
            <LocationCard
              key={card.id}
              card={card}
              canManage={canManage}
              onOpen={() => router.push(`/portal/locaties/${card.id}`)}
              onEdit={() => handleEdit(card.id)}
              onSetMain={() => setConfirmMainId(card.id)}
              onToggleArchive={() => handleToggleArchive(card)}
              onDeleteRequest={() => setConfirmDeleteId(card.id)}
            />
          ))}
        </div>
      )}

      {confirmMainId && (
        <ConfirmDialog
          title="Hoofdlocatie wijzigen?"
          message="Deze locatie wordt de nieuwe hoofdlocatie. De huidige hoofdlocatie verliest die status."
          confirmLabel="Bevestigen"
          danger={false}
          loading={busyId === confirmMainId}
          onCancel={() => setConfirmMainId(null)}
          onConfirm={handleSetMain}
        />
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title="Locatie verwijderen?"
          message="Dit verwijdert de locatie permanent. Deze actie kan niet ongedaan worden gemaakt."
          confirmLabel="Verwijderen"
          loading={busyId === confirmDeleteId}
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={handleDelete}
        />
      )}
      {toastNode}
    </div>
  );
}
