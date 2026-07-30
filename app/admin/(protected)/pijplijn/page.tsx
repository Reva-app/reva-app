"use client";

import { useEffect, useState } from "react";
import { Plus, AlertCircle } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  loadSalesLeads, createSalesLead, updateSalesLeadStage, updateSalesLead, deleteSalesLead,
  summarizeSalesLeads,
  type SalesLead, type SalesLeadStage, type SalesLeadInput,
} from "@/lib/services/salesPipelineService";

const inputStyle = {
  borderColor: "#e8e5df",
  background: "#f8f7f4",
  color: "#1a1a1a",
};

const STAGES: { key: SalesLeadStage; label: string }[] = [
  { key: "nieuw", label: "Nieuw" },
  { key: "contact_gelegd", label: "Contact gelegd" },
  { key: "demo_gepland", label: "Demo gepland" },
  { key: "onderhandeling", label: "Onderhandeling" },
  { key: "gewonnen", label: "Gewonnen" },
  { key: "verloren", label: "Verloren" },
];

function formatEuro(value: number | null): string {
  if (value === null) return "n.v.t.";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function isActionOverdue(lead: SalesLead): boolean {
  if (!lead.nextActionDate || lead.stage === "gewonnen" || lead.stage === "verloren") return false;
  return new Date(lead.nextActionDate + "T00:00:00") < new Date(new Date().toDateString());
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

// ─── Lead card ────────────────────────────────────────────────────────────────

function LeadCard({ lead, onDragStart, onClick }: {
  lead: SalesLead; onDragStart: (e: React.DragEvent) => void; onClick: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="rounded-xl border p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
      style={{ background: "#ffffff", borderColor: "#e8e5df" }}
    >
      <p className="text-sm font-medium text-gray-800 truncate">{lead.companyName}</p>
      {lead.contactName && <p className="text-xs text-gray-400 mt-0.5 truncate">{lead.contactName}</p>}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-500">{formatEuro(lead.estimatedValue)}</span>
        {isActionOverdue(lead) && (
          <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "#fffbeb", color: "#b45309" }}>
            <AlertCircle size={10} /> Actie verlopen
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Lead form modal ──────────────────────────────────────────────────────────

function LeadFormModal({ initial, defaultStage, onClose, onSave, onDelete }: {
  initial?: SalesLead;
  defaultStage: SalesLeadStage;
  onClose: () => void;
  onSave: (input: SalesLeadInput) => void;
  onDelete?: () => void;
}) {
  const [companyName, setCompanyName] = useState(initial?.companyName ?? "");
  const [contactName, setContactName] = useState(initial?.contactName ?? "");
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? "");
  const [stage, setStage] = useState<SalesLeadStage>(initial?.stage ?? defaultStage);
  const [estimatedValue, setEstimatedValue] = useState(initial?.estimatedValue?.toString() ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [lastContactDate, setLastContactDate] = useState(initial?.lastContactDate ?? "");
  const [nextActionDate, setNextActionDate] = useState(initial?.nextActionDate ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleSave() {
    setSubmitted(true);
    if (!companyName.trim()) return;
    onSave({
      companyName, contactName, contactEmail, contactPhone, stage,
      estimatedValue: estimatedValue.trim() ? Number(estimatedValue) : null,
      notes, lastContactDate: lastContactDate || null, nextActionDate: nextActionDate || null,
    });
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-lg">
      <div className="rounded-2xl overflow-hidden" style={{ background: "#ffffff" }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: "#f0ede8" }}>
          <p className="text-sm font-semibold text-gray-900">{initial ? "Bedrijf bewerken" : "Nieuw bedrijf toevoegen"}</p>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <FieldLabel>Bedrijfsnaam *</FieldLabel>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Bijv. Fysiotherapie Voorbeeldpraktijk"
              className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none" style={inputStyle} />
            {submitted && !companyName.trim() && <p className="text-xs text-red-400 mt-1">Vul een bedrijfsnaam in</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Contactpersoon</FieldLabel>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)}
                className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Fase</FieldLabel>
              <select value={stage} onChange={(e) => setStage(e.target.value as SalesLeadStage)}
                className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none" style={inputStyle}>
                {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>E-mailadres</FieldLabel>
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Telefoonnummer</FieldLabel>
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
                className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none" style={inputStyle} />
            </div>
          </div>
          <div>
            <FieldLabel>Geschatte waarde</FieldLabel>
            <input type="number" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)}
              placeholder="n.v.t." className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Laatste contact</FieldLabel>
              <DatePicker value={lastContactDate} onChange={setLastContactDate} placeholder="Nog geen contact geweest" />
            </div>
            <div>
              <FieldLabel>Volgende actie</FieldLabel>
              <DatePicker value={nextActionDate} onChange={setNextActionDate} placeholder="Geen datum gekozen" />
            </div>
          </div>
          <div>
            <FieldLabel>Notities</FieldLabel>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              className="w-full text-sm rounded-xl border px-4 py-2.5 resize-none focus:outline-none" style={inputStyle} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t" style={{ borderColor: "#f0ede8" }}>
          <div>
            {initial && onDelete && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Zeker weten?</span>
                  <Button size="sm" variant="danger" onClick={onDelete}>Ja, verwijderen</Button>
                  <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>Nee</Button>
                </div>
              ) : (
                <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>Verwijderen</Button>
              )
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={onClose}>Annuleren</Button>
            <Button size="sm" onClick={handleSave}>Opslaan</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPijplijnPage() {
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOverStage, setDragOverStage] = useState<SalesLeadStage | null>(null);
  const [modal, setModal] = useState<{ mode: "create"; stage: SalesLeadStage } | { mode: "edit"; lead: SalesLead } | null>(null);

  function refresh() {
    loadSalesLeads().then((data) => { setLeads(data); setLoading(false); });
  }

  useEffect(() => {
    refresh();
  }, []);

  const summary = summarizeSalesLeads(leads);

  async function handleDrop(leadId: string, newStage: SalesLeadStage) {
    setDragOverStage(null);
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === newStage) return;
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l)));
    const { error } = await updateSalesLeadStage(leadId, newStage);
    if (error) refresh();
  }

  async function handleSave(input: SalesLeadInput) {
    if (modal?.mode === "edit") {
      await updateSalesLead(modal.lead.id, input);
    } else {
      await createSalesLead(input);
    }
    setModal(null);
    refresh();
  }

  async function handleDelete() {
    if (modal?.mode !== "edit") return;
    await deleteSalesLead(modal.lead.id);
    setModal(null);
    refresh();
  }

  return (
    <div className="p-4 sm:p-6 max-w-full mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <SectionHeader
          title="Pijplijn"
          subtitle={loading ? "Laden…" : `${summary.openCount} openstaande ${summary.openCount === 1 ? "deal" : "deals"}`}
        />
        <Button size="sm" onClick={() => setModal({ mode: "create", stage: "nieuw" })}>
          <Plus size={14} /> Nieuw bedrijf toevoegen
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Laden…</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {STAGES.map((stageInfo) => {
            const stageLeads = leads.filter((l) => l.stage === stageInfo.key);
            const isOpenStage = stageInfo.key !== "gewonnen" && stageInfo.key !== "verloren";
            const stageValue = stageLeads.reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0);
            const isOver = dragOverStage === stageInfo.key;
            return (
              <div
                key={stageInfo.key}
                onDragOver={(e) => { e.preventDefault(); setDragOverStage(stageInfo.key); }}
                onDragLeave={() => setDragOverStage((prev) => (prev === stageInfo.key ? null : prev))}
                onDrop={(e) => { e.preventDefault(); handleDrop(e.dataTransfer.getData("text/plain"), stageInfo.key); }}
                className="rounded-2xl w-64 shrink-0 flex flex-col"
                style={{ background: isOver ? "#fff3ee" : "#f8f7f4", border: `1.5px solid ${isOver ? "#fcd9c8" : "#e8e5df"}`, transition: "background 0.1s" }}
              >
                <div className="px-3 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-800">{stageInfo.label}</p>
                    <span className="text-xs text-gray-400">{stageLeads.length}</span>
                  </div>
                  {isOpenStage && stageValue > 0 && (
                    <p className="text-[11px] text-gray-400 mt-0.5">{formatEuro(stageValue)}</p>
                  )}
                </div>
                <div className="px-2.5 pb-2.5 space-y-2 flex-1 min-h-[60px]">
                  {stageLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", lead.id)}
                      onClick={() => setModal({ mode: "edit", lead })}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setModal({ mode: "create", stage: stageInfo.key })}
                  className="flex items-center justify-center gap-1 text-xs font-medium py-2 mx-2.5 mb-2.5 rounded-lg transition-colors hover:bg-white/60"
                  style={{ color: "#9ca3af" }}
                >
                  <Plus size={12} /> Toevoegen
                </button>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <LeadFormModal
          initial={modal.mode === "edit" ? modal.lead : undefined}
          defaultStage={modal.mode === "create" ? modal.stage : "nieuw"}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={modal.mode === "edit" ? handleDelete : undefined}
        />
      )}
    </div>
  );
}
