"use client";

import { useState, useEffect } from "react";
import { useAppData } from "@/lib/store";
import {
  type DossierDocument,
  type FotoUpdate,
  type Contactpersoon,
  type DocumentType,
  documentTypeLabel,
  formatDate,
} from "@/lib/data";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  FileText, Image, Users, Plus, Phone, Mail, Building,
  Download, Eye, Trash2, X, Pencil, Check, Camera,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function herstelWeek(date: string, blessureDatum: string): number {
  if (!blessureDatum) return 1;
  const diff = new Date(date + "T12:00:00").getTime() - new Date(blessureDatum + "T12:00:00").getTime();
  return Math.max(1, Math.ceil(diff / (7 * 24 * 60 * 60 * 1000)));
}

function initialen(naam: string): string {
  return naam.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function avatarColor(functie: string): string {
  const f = functie.toLowerCase();
  if (f.includes("chirurg") || f.includes("orthoped") || f.includes("specialist")) return "#1d4ed8";
  if (f.includes("fysio")) return "#0f766e";
  if (f.includes("huisarts")) return "#6d28d9";
  if (f.includes("verpleeg") || f.includes("zorg")) return "#be185d";
  if (f.includes("sport")) return "#b45309";
  return "#1c1c1e";
}

const DOC_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "verslag", label: "Verslag" },
  { value: "scan",    label: "Scan / MRI" },
  { value: "brief",   label: "Brief" },
  { value: "recept",  label: "Recept" },
  { value: "overig",  label: "Overig" },
];

const ZORGVERLENER_OPTIONS = ["Ziekenhuis", "Fysiotherapeut", "Huisarts", "Anders"];

const DOC_TYPE_BADGE: Record<DocumentType, "accent" | "blue" | "muted" | "warning" | "default" | "purple"> = {
  verslag: "blue",
  scan:    "purple",
  brief:   "muted",
  recept:  "warning",
  overig:  "default",
};

// ─── Form helpers ─────────────────────────────────────────────────────────────

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
      {children}
      {optional && <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full" style={{ background: "#f3f0eb", color: "#a8a29e" }}>Optioneel</span>}
    </label>
  );
}
function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="w-full text-sm rounded-xl border px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-colors"
    style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }} />;
}
function FormTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className="w-full text-sm rounded-xl border px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-200 transition-colors"
    style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }} />;
}
function FormSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full text-sm rounded-xl border px-3 py-2.5 focus:outline-none appearance-none"
      style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: "36px" }}>
      {children}
    </select>
  );
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "#ffffff", boxShadow: "0 24px 64px rgba(0,0,0,0.18)", maxHeight: "calc(100vh - 2rem)" }}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b shrink-0" style={{ borderColor: "#f0ede8" }}>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100">
            <X size={15} className="text-gray-400" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

// ─── Document modal ───────────────────────────────────────────────────────────

function DocumentModal({ initial, onClose, onSave }: {
  initial?: DossierDocument;
  onClose: () => void;
  onSave: (d: DossierDocument) => void;
}) {
  const [title,              setTitle]             = useState(initial?.title ?? "");
  const [type,               setType]              = useState<DocumentType>(initial?.type ?? "verslag");
  const [date,               setDate]              = useState(initial?.date ?? todayStr());
  const [zorgverlener,       setZorgverlener]      = useState(initial?.zorgverlener ?? "Ziekenhuis");
  const [zorgverlenerAnders, setZorgverlenerAnders]= useState(initial?.zorgverlenerAnders ?? "");
  const [omschrijving,       setOmschrijving]      = useState(initial?.omschrijving ?? "");
  const [bestandsnaam,       setBestandsnaam]      = useState(initial?.bestandsnaam ?? "");
  const [submitted,          setSubmitted]         = useState(false);

  function handleSave() {
    setSubmitted(true);
    if (!title.trim() || !date) return;
    onSave({
      id: initial?.id ?? uid(),
      title: title.trim(),
      type,
      date,
      zorgverlener,
      zorgverlenerAnders: zorgverlener === "Anders" ? zorgverlenerAnders.trim() : undefined,
      omschrijving: omschrijving.trim(),
      bestandsnaam: bestandsnaam.trim() || undefined,
    });
  }

  return (
    <ModalShell title={initial ? "Document bewerken" : "Document toevoegen"} onClose={onClose}>
      <div className="p-4 sm:p-6 space-y-4">
        <div>
          <FieldLabel>Titel *</FieldLabel>
          <FormInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bijv. MRI uitslag linkerknie" />
          {submitted && !title.trim() && <p className="text-xs text-red-400 mt-1">Vul een titel in</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Type</FieldLabel>
            <FormSelect value={type} onChange={(v) => setType(v as DocumentType)}>
              {DOC_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </FormSelect>
          </div>
          <div>
            <FieldLabel>Datum *</FieldLabel>
            <DatePicker value={date} onChange={setDate} placeholder="Kies datum" />
            {submitted && !date && <p className="text-xs text-red-400 mt-1">Kies een datum</p>}
          </div>
        </div>
        <div>
          <FieldLabel>Zorgverlener</FieldLabel>
          <FormSelect value={zorgverlener} onChange={setZorgverlener}>
            {ZORGVERLENER_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </FormSelect>
        </div>
        {zorgverlener === "Anders" && (
          <div>
            <FieldLabel>Naam zorgverlener</FieldLabel>
            <FormInput value={zorgverlenerAnders} onChange={(e) => setZorgverlenerAnders(e.target.value)} placeholder="Bijv. Sportarts Utrecht" />
          </div>
        )}
        <div>
          <FieldLabel optional>Omschrijving</FieldLabel>
          <FormTextarea value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} rows={3} placeholder="Korte omschrijving van het document..." />
        </div>
        <div>
          <FieldLabel optional>Bestandsnaam</FieldLabel>
          <FormInput value={bestandsnaam} onChange={(e) => setBestandsnaam(e.target.value)} placeholder="Bijv. mri_knie_feb.pdf" />
        </div>
      </div>
      <div className="flex gap-2 justify-end px-4 sm:px-6 py-4 border-t shrink-0" style={{ borderColor: "#f0ede8" }}>
        <Button variant="secondary" size="sm" onClick={onClose}>Annuleren</Button>
        <Button size="sm" onClick={handleSave}><Check size={14} /> Opslaan</Button>
      </div>
    </ModalShell>
  );
}

// ─── Foto modal ───────────────────────────────────────────────────────────────

function FotoModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (f: FotoUpdate) => void;
}) {
  const [date,    setDate]    = useState(todayStr());
  const [notitie, setNotitie] = useState("");

  return (
    <ModalShell title="Foto update toevoegen" onClose={onClose}>
      <div className="p-4 sm:p-6 space-y-4">
        {/* Upload placeholder */}
        <div className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-10 gap-2 cursor-pointer hover:bg-gray-50 transition-colors"
          style={{ borderColor: "#e8e5df" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#f3f0eb" }}>
            <Camera size={18} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-500">Klik om een foto te uploaden</p>
          <p className="text-xs text-gray-300">JPG, PNG — max 10 MB</p>
        </div>
        <div>
          <FieldLabel>Datum</FieldLabel>
          <DatePicker value={date} onChange={setDate} placeholder="Kies datum" />
        </div>
        <div>
          <FieldLabel optional>Notitie</FieldLabel>
          <FormTextarea value={notitie} onChange={(e) => setNotitie(e.target.value)} rows={2} placeholder="Bijv. zwelling afgenomen, litteken heelt goed..." />
        </div>
      </div>
      <div className="flex gap-2 justify-end px-4 sm:px-6 py-4 border-t shrink-0" style={{ borderColor: "#f0ede8" }}>
        <Button variant="secondary" size="sm" onClick={onClose}>Annuleren</Button>
        <Button size="sm" onClick={() => onSave({ id: uid(), date, notitie: notitie.trim() || undefined })}>
          <Check size={14} /> Toevoegen
        </Button>
      </div>
    </ModalShell>
  );
}

// ─── Contactpersoon modal ─────────────────────────────────────────────────────

function ContactModal({ initial, onClose, onSave }: {
  initial?: Contactpersoon;
  onClose: () => void;
  onSave: (c: Contactpersoon) => void;
}) {
  const [naam,        setNaam]        = useState(initial?.naam ?? "");
  const [functie,     setFunctie]     = useState(initial?.functie ?? "");
  const [organisatie, setOrganisatie] = useState(initial?.organisatie ?? "");
  const [telefoon,    setTelefoon]    = useState(initial?.telefoon ?? "");
  const [email,       setEmail]       = useState(initial?.email ?? "");
  const [notitie,     setNotitie]     = useState(initial?.notitie ?? "");
  const [submitted,   setSubmitted]   = useState(false);

  function handleSave() {
    setSubmitted(true);
    if (!naam.trim()) return;
    onSave({
      id: initial?.id ?? uid(),
      naam: naam.trim(),
      functie: functie.trim(),
      organisatie: organisatie.trim(),
      telefoon: telefoon.trim(),
      email: email.trim(),
      notitie: notitie.trim() || undefined,
    });
  }

  return (
    <ModalShell title={initial ? "Contactpersoon bewerken" : "Contactpersoon toevoegen"} onClose={onClose}>
      <div className="p-4 sm:p-6 space-y-4">
        <div>
          <FieldLabel>Naam *</FieldLabel>
          <FormInput value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Bijv. Dr. M. Bakker" />
          {submitted && !naam.trim() && <p className="text-xs text-red-400 mt-1">Vul een naam in</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel optional>Functie</FieldLabel>
            <FormInput value={functie} onChange={(e) => setFunctie(e.target.value)} placeholder="Bijv. Orthopedisch chirurg" />
          </div>
          <div>
            <FieldLabel optional>Organisatie</FieldLabel>
            <FormInput value={organisatie} onChange={(e) => setOrganisatie(e.target.value)} placeholder="Bijv. Erasmus MC" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel optional>Telefoonnummer</FieldLabel>
            <FormInput value={telefoon} onChange={(e) => setTelefoon(e.target.value)} placeholder="010 - 123 4567" />
          </div>
          <div>
            <FieldLabel optional>E-mailadres</FieldLabel>
            <FormInput value={email} onChange={(e) => setEmail(e.target.value)} placeholder="naam@organisatie.nl" type="email" />
          </div>
        </div>
        <div>
          <FieldLabel optional>Notitie / rol</FieldLabel>
          <FormTextarea value={notitie} onChange={(e) => setNotitie(e.target.value)} rows={2} placeholder="Bijv. behandelend arts ACL, bel alleen op werkdagen..." />
        </div>
      </div>
      <div className="flex gap-2 justify-end px-4 sm:px-6 py-4 border-t shrink-0" style={{ borderColor: "#f0ede8" }}>
        <Button variant="secondary" size="sm" onClick={onClose}>Annuleren</Button>
        <Button size="sm" onClick={handleSave}><Check size={14} /> Opslaan</Button>
      </div>
    </ModalShell>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, sub, onAdd, label }: {
  icon: React.ElementType; title: string; sub: string; onAdd: () => void; label: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: "#f3f0eb" }}>
        <Icon size={20} className="text-gray-300" />
      </div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <p className="text-xs text-gray-300 mb-5">{sub}</p>
      <button onClick={onAdd}
        className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        style={{ background: "#1c1c1e", color: "#ffffff" }}>
        <Plus size={13} /> {label}
      </button>
    </div>
  );
}

// ─── Foto timeline ────────────────────────────────────────────────────────────

function FotoTimeline({ fotos, blessureDatum, onDelete }: {
  fotos: FotoUpdate[];
  blessureDatum: string;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div
        className="absolute top-0 bottom-0 left-[19px] w-px"
        style={{ background: "linear-gradient(to bottom, #e8632a33, #e8632a22, transparent)" }}
      />

      <div className="space-y-6">
        {fotos.map((f, idx) => {
          const week = herstelWeek(f.date, blessureDatum);
          const isLast = idx === fotos.length - 1;
          return (
            <div key={f.id} className="relative flex gap-5 items-start">
              {/* Node */}
              <div className="relative z-10 shrink-0 flex items-center justify-center mt-1"
                style={{ width: "40px", height: "40px" }}>
                <div
                  className="w-3 h-3 rounded-full border-2"
                  style={{ borderColor: "#e8632a", background: "#fff5f0" }}
                />
              </div>

              {/* Card */}
              <div
                className="flex-1 rounded-2xl border overflow-hidden group"
                style={{
                  borderColor: "#e8e5df",
                  background: "#ffffff",
                  boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
                  marginBottom: isLast ? 0 : undefined,
                }}
              >
                {/* Card header */}
                <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#e8632a" }}>
                      Week {week} herstel
                    </p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{formatDate(f.date)}</p>
                  </div>
                  <button
                    onClick={() => onDelete(f.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ border: "1px solid #f3f0eb", background: "#f8f7f4" }}
                  >
                    <Trash2 size={13} style={{ color: "#9ca3af" }} />
                  </button>
                </div>

                {/* Photo */}
                <div
                  className="mx-4 mb-3 rounded-xl flex flex-col items-center justify-center gap-2"
                  style={{ background: "#f3f0eb", height: "200px" }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.7)" }}>
                    <Image size={18} className="text-gray-300" />
                  </div>
                  <p className="text-[10px]" style={{ color: "#c4bfb9" }}>Geen preview</p>
                </div>

                {/* Note */}
                {f.notitie ? (
                  <p className="px-4 pb-4 text-sm text-gray-500 leading-relaxed">{f.notitie}</p>
                ) : (
                  <p className="px-4 pb-4 text-sm italic" style={{ color: "#d1cdc7" }}>Geen notitie</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "documenten" | "foto-updates" | "contactpersonen";

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DossierPage() {
  const {
    profile, hydrated,
    dossierDocumenten, addDossierDocument, updateDossierDocument, deleteDossierDocument,
    fotoUpdates, addFotoUpdate, deleteFotoUpdate,
    contactpersonen, addContactpersoon, updateContactpersoon, deleteContactpersoon,
  } = useAppData();

  const [tab, setTab] = useState<Tab>("foto-updates");

  // Set active tab from URL query param (e.g. /dossier?tab=documenten)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab") as Tab | null;
    if (tabParam && (tabParam === "documenten" || tabParam === "foto-updates" || tabParam === "contactpersonen")) {
      setTab(tabParam);
    }
  }, []);

  // Document modal
  const [docModal, setDocModal] = useState<{ open: boolean; editing?: DossierDocument }>({ open: false });

  // Foto modal
  const [fotoModal, setFotoModal] = useState(false);

  // Contact modal
  const [contactModal, setContactModal] = useState<{ open: boolean; editing?: Contactpersoon }>({ open: false });

  // Confirm delete
  const [confirmDel, setConfirmDel] = useState<{ type: "doc" | "foto" | "contact"; id: string } | null>(null);

  const tabs: { key: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { key: "foto-updates",    label: "Foto updates",     icon: Image,    count: fotoUpdates.length },
    { key: "contactpersonen", label: "Contactpersonen",  icon: Users,    count: contactpersonen.length },
    { key: "documenten",      label: "Documenten",       icon: FileText, count: dossierDocumenten.length },
  ];

  const sortedDocs = [...dossierDocumenten].sort((a, b) => b.date.localeCompare(a.date));
  const sortedFotos = [...fotoUpdates].sort((a, b) => b.date.localeCompare(a.date));

  function handleAddButton() {
    if (tab === "documenten")      setDocModal({ open: true });
    if (tab === "foto-updates")    setFotoModal(true);
    if (tab === "contactpersonen") setContactModal({ open: true });
  }

  function addLabel() {
    if (tab === "documenten")      return "Document toevoegen";
    if (tab === "foto-updates")    return "Foto toevoegen";
    return "Contactpersoon toevoegen";
  }

  if (!hydrated) return null;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Desktop: button in SectionHeader */}
      <div className="hidden sm:block">
        <SectionHeader
          title="Medisch Dossier"
          subtitle="Documenten, foto updates en contactpersonen op één plek"
          action={
            <Button size="sm" onClick={handleAddButton}>
              <Plus size={15} /> {addLabel()}
            </Button>
          }
        />
      </div>
      {/* Mobile: button below subtitle */}
      <div className="sm:hidden">
        <SectionHeader
          title="Medisch Dossier"
          subtitle="Documenten, foto updates en contactpersonen op één plek"
        />
        <div className="mt-3">
          <Button size="sm" onClick={handleAddButton}>
            <Plus size={15} /> {addLabel()}
          </Button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#f3f0eb" }}>
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === key ? "#ffffff" : "transparent",
              color: tab === key ? "#1a1a1a" : "#6b7280",
              boxShadow: tab === key ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
            }}>
            <Icon size={14} />
            <span className="hidden sm:inline">{label}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: tab === key ? "#e8632a" : "#e8e5df", color: tab === key ? "#ffffff" : "#9ca3af" }}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Documenten ───────────────────────────────────────────────────── */}
      {tab === "documenten" && (
        sortedDocs.length === 0 ? (
          <EmptyState icon={FileText} title="Nog geen documenten" sub="Voeg je eerste medisch document toe"
            onAdd={() => setDocModal({ open: true })} label="Document toevoegen" />
        ) : (
          <div className="space-y-3">
            {sortedDocs.map((doc) => (
              <div key={doc.id} className="rounded-2xl border bg-white p-4 flex items-start gap-4"
                style={{ borderColor: "#e8e5df", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "#fff3ee" }}>
                  <FileText size={18} style={{ color: "#e8632a" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{doc.title}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={DOC_TYPE_BADGE[doc.type]}>{documentTypeLabel(doc.type)}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {doc.zorgverlener === "Anders" ? doc.zorgverlenerAnders : doc.zorgverlener}
                    {" · "}{formatDate(doc.date)}
                  </p>
                  {doc.omschrijving && (
                    <p className="text-sm text-gray-600 mt-2 leading-relaxed">{doc.omschrijving}</p>
                  )}
                  {doc.bestandsnaam && (
                    <p className="text-xs text-gray-400 mt-1.5 font-mono">{doc.bestandsnaam}</p>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <button className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
                      <Eye size={12} /> Bekijken
                    </button>
                    <button className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
                      <Download size={12} /> Downloaden
                    </button>
                    <button onClick={() => setDocModal({ open: true, editing: doc })}
                      className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
                      <Pencil size={12} /> Bewerken
                    </button>
                    <button onClick={() => setConfirmDel({ type: "doc", id: doc.id })}
                      className="flex items-center gap-1 text-xs font-medium text-gray-300 hover:text-red-400 transition-colors ml-auto">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Foto updates ─────────────────────────────────────────────────── */}
      {tab === "foto-updates" && (
        sortedFotos.length === 0 ? (
          <EmptyState icon={Camera} title="Nog geen foto updates" sub="Documenteer je visuele voortgang per week"
            onAdd={() => setFotoModal(true)} label="Foto toevoegen" />
        ) : (
          <FotoTimeline
            fotos={sortedFotos}
            blessureDatum={profile.blessureDatum}
            onDelete={(id: string) => setConfirmDel({ type: "foto", id })}
          />
        )
      )}

      {/* ── Contactpersonen ──────────────────────────────────────────────── */}
      {tab === "contactpersonen" && (
        contactpersonen.length === 0 ? (
          <EmptyState icon={Users} title="Nog geen contactpersonen" sub="Voeg je zorgverleners toe voor snel overzicht"
            onAdd={() => setContactModal({ open: true })} label="Contactpersoon toevoegen" />
        ) : (
          <div className="space-y-3">
            {contactpersonen.map((c) => (
              <div key={c.id} className="rounded-2xl border bg-white p-4 flex items-start gap-4"
                style={{ borderColor: "#e8e5df", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ background: avatarColor(c.functie) }}>
                  {initialen(c.naam)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{c.naam}</p>
                      {c.functie && <p className="text-xs text-gray-400 mt-0.5">{c.functie}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setContactModal({ open: true, editing: c })}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors" title="Bewerken">
                        <Pencil size={12} className="text-gray-400" />
                      </button>
                      <button onClick={() => setConfirmDel({ type: "contact", id: c.id })}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors" title="Verwijderen">
                        <Trash2 size={12} className="text-gray-300 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5">
                    {c.organisatie && (
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Building size={11} /> {c.organisatie}
                      </span>
                    )}
                    {c.telefoon && (
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Phone size={11} /> {c.telefoon}
                      </span>
                    )}
                    {c.email && (
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Mail size={11} /> {c.email}
                      </span>
                    )}
                  </div>
                  {c.notitie && (
                    <p className="text-xs text-gray-400 mt-2 italic">{c.notitie}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {docModal.open && (
        <DocumentModal initial={docModal.editing} onClose={() => setDocModal({ open: false })}
          onSave={(d) => {
            if (docModal.editing) updateDossierDocument(d.id, d);
            else addDossierDocument(d);
            setDocModal({ open: false });
          }} />
      )}

      {fotoModal && (
        <FotoModal onClose={() => setFotoModal(false)}
          onSave={(f) => { addFotoUpdate(f); setFotoModal(false); }} />
      )}

      {contactModal.open && (
        <ContactModal initial={contactModal.editing} onClose={() => setContactModal({ open: false })}
          onSave={(c) => {
            if (contactModal.editing) updateContactpersoon(c.id, c);
            else addContactpersoon(c);
            setContactModal({ open: false });
          }} />
      )}

      {/* ── Confirm delete ────────────────────────────────────────────────── */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}>
          <div className="rounded-2xl bg-white p-6 w-full max-w-sm shadow-2xl">
            <p className="text-sm font-semibold text-gray-900 mb-1">Verwijderen?</p>
            <p className="text-xs text-gray-400 mb-5">Deze actie kan niet ongedaan worden gemaakt.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setConfirmDel(null)}>Annuleren</Button>
              <button onClick={() => {
                if (confirmDel.type === "doc")     deleteDossierDocument(confirmDel.id);
                if (confirmDel.type === "foto")    deleteFotoUpdate(confirmDel.id);
                if (confirmDel.type === "contact") deleteContactpersoon(confirmDel.id);
                setConfirmDel(null);
              }} className="text-sm font-semibold px-3 py-1.5 rounded-xl transition-colors"
                style={{ background: "#fef2f2", color: "#ef4444" }}>
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
