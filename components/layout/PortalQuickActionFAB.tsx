"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserPlus, Dumbbell, ListChecks, ClipboardList, Loader2 } from "lucide-react";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { useToast } from "@/components/ui/Toast";
import { MANAGE_PATIENTS_ROLES } from "@/lib/services/portalService";
import {
  MANAGE_PROTOCOLS_ROLES, createOrgExercise, createScheduleLibraryItem, createProtocol,
} from "@/lib/services/protocolService";

type ActionId = "patient" | "oefening" | "schema" | "herstelplan";

const ACTIONS: { id: ActionId; label: string; icon: typeof Plus; color: string; bg: string }[] = [
  { id: "patient",     label: "Patiënt toevoegen",  icon: UserPlus,      color: "var(--brand-accent, #e8632a)", bg: "var(--brand-accent-soft, #fff3ee)" },
  { id: "oefening",    label: "Oefening toevoegen", icon: Dumbbell,      color: "#0ea5e9", bg: "#f0f9ff" },
  { id: "schema",      label: "Schema maken",       icon: ListChecks,    color: "#8b5cf6", bg: "#f5f3ff" },
  { id: "herstelplan", label: "Herstelplan maken",  icon: ClipboardList, color: "#16a34a", bg: "#f0fdf4" },
];

/**
 * Zwevende +-knop rechtsonder in het praktijkportaal (alleen telefoon/tablet,
 * onder lg) — zelfde vorm en animatie als QuickActionFAB in de patiënt-app,
 * met de snelle acties van een behandelaar. "Patiënt toevoegen" opent de
 * wizard op de patiëntenpagina (?nieuw=1); oefening, schema en herstelplan
 * maken net als de knoppen op hun eigen pagina een concept aan en openen dat.
 */
export function PortalQuickActionFAB() {
  const router = useRouter();
  const { membership } = usePortalMembership();
  const { showToast, toastNode } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ActionId | null>(null);

  if (!membership) return null;
  const canManagePatients = MANAGE_PATIENTS_ROLES.includes(membership.roleKey);
  const canManageContent = MANAGE_PROTOCOLS_ROLES.includes(membership.roleKey);
  const actions = ACTIONS.filter((a) => (a.id === "patient" ? canManagePatients : canManageContent));
  if (actions.length === 0) return null;

  async function run(id: ActionId) {
    if (!membership || busy) return;
    const orgId = membership.organizationId;
    if (id === "patient") {
      setOpen(false);
      router.push("/portal/patienten?nieuw=1");
      return;
    }
    setBusy(id);
    const result =
      id === "oefening"
        ? await createOrgExercise(orgId, {
            title: "Nieuwe oefening", exerciseType: "kracht", description: "", instructions: "",
            defaultSets: null, defaultReps: null, defaultDurationSeconds: null, defaultLoadText: "",
            tags: [], mediaPath: null, mediaType: null,
          })
        : id === "schema"
          ? await createScheduleLibraryItem(orgId, { title: "Nieuw schema", description: "" })
          : await createProtocol(orgId, { name: "Nieuw herstelplan", description: "", injuryCategory: "custom" });
    setBusy(null);
    if (result.error || !result.id) { showToast(result.error ?? "Aanmaken is niet gelukt.", "error"); return; }
    setOpen(false);
    const base = id === "oefening" ? "oefeningen" : id === "schema" ? "schemas" : "herstelplannen";
    router.push(`/portal/${base}/${result.id}?draft=1`);
  }

  return (
    <>
      {open && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-(--z-nav-overlay)"
            style={{ background: "rgba(0,0,0,0.4)", animation: "fadeIn 0.15s ease" }}
            onClick={() => setOpen(false)}
          />
          <div
            className="lg:hidden fixed z-(--z-fab) flex flex-col-reverse items-end gap-3"
            style={{ bottom: "calc(var(--nav-height) + env(safe-area-inset-bottom, 0px) + 84px)", right: "16px" }}
          >
            {actions.map((action, i) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => run(action.id)}
                  disabled={!!busy}
                  className="flex items-center gap-3 touch-press disabled:opacity-70"
                  style={{ animation: `fabActionIn 0.22s ease ${i * 45}ms both` }}
                >
                  <span
                    className="text-xs font-semibold px-3 py-2 rounded-xl whitespace-nowrap"
                    style={{ background: "#ffffff", color: "#1a1a1a", boxShadow: "0 2px 10px rgba(0,0,0,0.14)" }}
                  >
                    {action.label}
                  </span>
                  <span
                    className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: action.bg, border: `1.5px solid color-mix(in srgb, ${action.color} 19%, transparent)`, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}
                  >
                    {busy === action.id
                      ? <Loader2 size={20} className="animate-spin" style={{ color: action.color }} />
                      : <Icon size={20} style={{ color: action.color }} />}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Snelle acties"
        aria-expanded={open}
        className="lg:hidden fixed z-(--z-fab) w-14 h-14 rounded-full flex items-center justify-center touch-press"
        style={{
          bottom: "calc(var(--nav-height) + env(safe-area-inset-bottom, 0px) + 16px)",
          right: "16px",
          background: open ? "#1c1c1e" : "var(--brand-accent, #e8632a)",
          boxShadow: open ? "0 6px 24px rgba(0,0,0,0.25)" : "0 6px 24px rgba(var(--brand-accent-rgb, 232, 99, 42),0.45)",
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
          transition: "background 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease",
          animation: "fabIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <Plus size={24} color="#ffffff" strokeWidth={2.5} />
      </button>
      {toastNode}
    </>
  );
}
