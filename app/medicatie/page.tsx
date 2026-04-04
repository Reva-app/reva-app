"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TimePicker } from "@/components/ui/TimePicker";
import { useAppData } from "@/lib/store";
import { formatDate, type MedicatieLog, type MedicatieSchema } from "@/lib/data";
import {
  InnameModal,
  FieldLabel,
  FormInput,
  MedPillButtons,
  getMedColor,
  type InnameFormFields,
  todayStr,
  nowTimeStr,
} from "@/components/medicatie/InnameModal";
import {
  Pill,
  Plus,
  Clock,
  AlertCircle,
  X,
  Bell,
  Trash2,
  Pencil,
  CalendarCheck,
  ListChecks,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function displayNaam(naam: string, naamAnders: string): string {
  return naam === "Anders" && naamAnders.trim() ? naamAnders.trim() : naam;
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className="relative shrink-0 w-10 h-6 rounded-full transition-colors"
      style={{ background: enabled ? "#e8632a" : "#e2e0db" }}
    >
      <span
        className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
        style={{ left: enabled ? "22px" : "4px", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
      />
    </button>
  );
}

// ─── Schema Form ───────────────────────────────────────────────────────────────

type SchemaFormState = {
  naam: string;
  naamAnders: string;
  dosering: string;
  hoeveelheid: string;
  tijden: string[];
  actief: boolean;
  notitie: string;
};

function emptySchemaForm(): SchemaFormState {
  return { naam: "Paracetamol", naamAnders: "", dosering: "", hoeveelheid: "", tijden: ["08:00"], actief: true, notitie: "" };
}

function SchemaForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: SchemaFormState;
  onSave: (data: SchemaFormState) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<SchemaFormState>(initial ?? emptySchemaForm());
  const [newTijd, setNewTijd] = useState("12:00");
  const [submitted, setSubmitted] = useState(false);
  const doseringRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof SchemaFormState>(key: K, val: SchemaFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function addTijd() {
    if (!newTijd || form.tijden.includes(newTijd)) return;
    set("tijden", [...form.tijden, newTijd].sort());
  }

  function removeTijd(t: string) {
    set("tijden", form.tijden.filter((x) => x !== t));
  }

  const doseringError = submitted && !form.dosering.trim();
  const naamAndersError = submitted && form.naam === "Anders" && !form.naamAnders.trim();
  const tijdenError = submitted && form.tijden.length === 0;

  const canSave =
    form.dosering.trim() &&
    form.tijden.length > 0 &&
    (form.naam !== "Anders" || form.naamAnders.trim());

  function handleSave() {
    setSubmitted(true);
    if (!canSave) {
      // Focus first error field
      if (!form.dosering.trim()) {
        doseringRef.current?.focus();
      }
      return;
    }
    onSave(form);
  }

  return (
    <div>
      {/* Light form body — gives inputs and labels a proper background against the dark card */}
      <div className="space-y-5 p-5 m-3 rounded-xl" style={{ background: "#ffffff" }}>
      <div>
        <FieldLabel>Medicatie</FieldLabel>
        <MedPillButtons value={form.naam} onChange={(v) => set("naam", v)} />
      </div>

      {form.naam === "Anders" && (
        <div>
          <FieldLabel>Vul medicatie in</FieldLabel>
          <FormInput
            value={form.naamAnders}
            onChange={(v) => set("naamAnders", v)}
            placeholder="Bijvoorbeeld: Pregabaline"
            error={naamAndersError}
          />
          {naamAndersError && (
            <p className="text-xs mt-1.5" style={{ color: "#ef4444" }}>Vul de naam van de medicatie in</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Dosering *</FieldLabel>
          <input
            ref={doseringRef}
            type="text"
            value={form.dosering}
            onChange={(e) => set("dosering", e.target.value)}
            placeholder="bijv. 500mg"
            className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none transition-colors"
            style={{
              borderColor: doseringError ? "#fca5a5" : "#e8e5df",
              background: doseringError ? "#fef2f2" : "#f8f7f4",
              color: "#1a1a1a",
            }}
          />
          {doseringError && (
            <p className="text-xs mt-1.5" style={{ color: "#ef4444" }}>Dosering is verplicht</p>
          )}
        </div>
        <div>
          <FieldLabel optional>Hoeveelheid</FieldLabel>
          <FormInput
            value={form.hoeveelheid}
            onChange={(v) => set("hoeveelheid", v)}
            placeholder="bijv. 2 tabletten"
          />
        </div>
      </div>

      <div>
        <FieldLabel>Tijdstippen *</FieldLabel>
        {form.tijden.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {form.tijden.map((t) => (
              <div
                key={t}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
                style={{ background: "#f3f0eb", color: "#374151" }}
              >
                <Clock size={11} style={{ color: "#e8632a" }} />
                {t}
                <button type="button" onClick={() => removeTijd(t)} className="ml-0.5 hover:text-red-500 transition-colors">
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
        {tijdenError && (
          <p className="text-xs mb-2" style={{ color: "#ef4444" }}>Voeg minimaal één tijdstip toe</p>
        )}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <TimePicker value={newTijd} onChange={setNewTijd} placeholder="Kies tijdstip" />
          </div>
          <button
            type="button"
            onClick={addTijd}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-xl border transition-colors hover:bg-gray-50"
            style={{ borderColor: "#e8e5df", color: "#e8632a" }}
          >
            <Plus size={13} />
            Toevoegen
          </button>
        </div>
      </div>

      <div>
        <FieldLabel optional>Notitie</FieldLabel>
        <textarea
          value={form.notitie}
          onChange={(e) => set("notitie", e.target.value)}
          placeholder="Bijzonderheden of instructies..."
          rows={2}
          className="w-full text-sm rounded-xl border px-4 py-2.5 resize-none focus:outline-none"
          style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-800">Schema actief</p>
          <p className="text-xs text-gray-400 mt-0.5">Je ontvangt herinneringen op de ingestelde tijdstippen</p>
        </div>
        <Toggle enabled={form.actief} onChange={(v) => set("actief", v)} />
      </div>
      </div>{/* end light form body */}

      <div className="flex gap-2 justify-end px-5 py-4">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: "#7c7c8a" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          Annuleren
        </button>
        <Button size="sm" onClick={handleSave}>
          Opslaan
        </Button>
      </div>
    </div>
  );
}

// ─── Schema Card ───────────────────────────────────────────────────────────────

function SchemaCard({
  schema,
  onToggle,
  onEdit,
  onDelete,
}: {
  schema: MedicatieSchema;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const naam = displayNaam(schema.naam, schema.naamAnders);
  const color = getMedColor(schema.naam);

  return (
    <div
      className="rounded-2xl border p-4 space-y-3 transition-all"
      style={{
        background: "#ffffff",
        borderColor: schema.actief ? "#e8e5df" : "#f0ede8",
        opacity: schema.actief ? 1 : 0.65,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}14` }}>
            <Pill size={15} style={{ color }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{naam}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {schema.dosering}{schema.hoeveelheid ? ` · ${schema.hoeveelheid}` : ""}
            </p>
          </div>
        </div>
        <Toggle enabled={schema.actief} onChange={onToggle} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {schema.tijden.map((t) => (
          <span
            key={t}
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ background: "#f3f0eb", color: "#374151" }}
          >
            <Clock size={10} style={{ color: "#e8632a" }} /> {t}
          </span>
        ))}
      </div>

      {schema.notitie && <p className="text-xs text-gray-400 italic">{schema.notitie}</p>}

      <div className="flex items-center gap-1 pt-2 border-t" style={{ borderColor: "#f0ede8" }}>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
        >
          <Pencil size={11} /> Bewerken
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-400"
        >
          <Trash2 size={11} /> Verwijderen
        </button>
      </div>
    </div>
  );
}

// ─── Log Item ─────────────────────────────────────────────────────────────────

function LogItem({
  med,
  onEdit,
  onDelete,
}: {
  med: MedicatieLog;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const color = getMedColor(med.naam);

  return (
    <div
      className="rounded-2xl border p-4 transition-all"
      style={{ background: "#ffffff", borderColor: "#e8e5df" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}14` }}
        >
          <Pill size={16} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900">{med.naam}</p>
            <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
              <Clock size={11} /> {med.time}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {med.dosering}
            {med.hoeveelheid && med.hoeveelheid !== "—" ? ` · ${med.hoeveelheid}` : ""}
            {" · "}{med.reden}
          </p>
          {med.notitie && <p className="text-xs text-gray-400 mt-1 italic">{med.notitie}</p>}

          <div className="flex items-center gap-1 mt-2.5">
            {confirmDelete ? (
              <>
                <span className="text-xs text-gray-500 mr-1">Verwijderen?</span>
                <button
                  onClick={onDelete}
                  className="text-xs font-medium px-2.5 py-1 rounded-lg text-white"
                  style={{ background: "#ef4444" }}
                >
                  Ja
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs font-medium px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                >
                  Annuleren
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onEdit}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-700"
                >
                  <Pencil size={10} /> Bewerken
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-400"
                >
                  <Trash2 size={10} /> Verwijderen
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MedicatiePage() {
  const {
    medicatie,
    addMedicatie,
    updateMedicatie,
    deleteMedicatie,
    medicatieSchemas,
    addMedicatieSchema,
    updateMedicatieSchema,
    deleteMedicatieSchema,
  } = useAppData();

  // Modal: null = closed, "new" = nieuwe inname, MedicatieLog = bewerken
  type ModalState = null | "new" | MedicatieLog;
  const [modalItem, setModalItem] = useState<ModalState>(null);

  // Schema panel
  type SchemaMode = "list" | "add" | { edit: MedicatieSchema };
  const [schemaMode, setSchemaMode] = useState<SchemaMode>("list");

  // Mobile tab
  const [mobileTab, setMobileTab] = useState<"overzicht" | "schema">("overzicht");

  // ── Stats ────────────────────────────────────────────────────────────────────
  const today = todayStr();
  const innamesVandaag = medicatie.filter((m) => m.date === today).length;

  // Parse "YYYY-MM-DD" as local midnight (avoids UTC timezone shift)
  function parseLocalDate(str: string): Date {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  // Whole calendar days from a to b (negative when b is before a).
  // Uses UTC noon on both sides to neutralise DST hour shifts.
  function calendarDaysBetween(a: Date, b: Date): number {
    const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate(), 12);
    const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate(), 12);
    return Math.round((utcB - utcA) / (1000 * 60 * 60 * 24));
  }

  const allDates = new Set(medicatie.map((m) => m.date));

  let stat2Value = 0;
  let stat2Label = "Dagen met medicatie";

  if (medicatie.length > 0) {
    const sortedDates = [...allDates].sort();
    const startDate   = sortedDates[0];                          // earliest log ever
    const lastLogDate = sortedDates[sortedDates.length - 1];     // most recent log

    const startD    = parseLocalDate(startDate);
    const lastLogD  = parseLocalDate(lastLogDate);
    const todayD    = parseLocalDate(today);
    const yesterdayD = new Date(todayD);
    yesterdayD.setDate(yesterdayD.getDate() - 1);

    // Days fully in the past (lastLogDate+1 through yesterday) with no log.
    // Today is still an active day and is never counted as missed.
    const missedDays = Math.max(0, calendarDaysBetween(lastLogD, yesterdayD));

    if (missedDays > 0) {
      stat2Label = "Dagen zonder medicatie";
      stat2Value = missedDays;
    } else {
      stat2Label = "Dagen met medicatie";
      // Inclusive day count from start date through today
      stat2Value = calendarDaysBetween(startD, todayD) + 1;
    }
  }
  const activeSchemasCount = medicatieSchemas.filter((s) => s.actief).length;

  // ── Grouped logs ─────────────────────────────────────────────────────────────
  const grouped: Record<string, typeof medicatie> = {};
  [...medicatie]
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
    .forEach((m) => {
      if (!grouped[m.date]) grouped[m.date] = [];
      grouped[m.date].push(m);
    });

  // ── Inname modal handlers ─────────────────────────────────────────────────────
  function handleSaveInname(data: InnameFormFields) {
    const effectiefNaam =
      data.naam === "Anders" && data.naamAnders.trim()
        ? data.naamAnders.trim()
        : data.naam;

    if (modalItem && modalItem !== "new") {
      updateMedicatie(modalItem.id, {
        naam: effectiefNaam,
        date: data.datum,
        time: data.tijdstip,
        dosering: data.dosering.trim(),
        hoeveelheid: data.hoeveelheid.trim() || "—",
        reden: data.reden.trim(),
        notitie: data.notitie.trim() || undefined,
      });
    } else {
      addMedicatie({
        id: crypto.randomUUID(),
        naam: effectiefNaam,
        date: data.datum,
        time: data.tijdstip,
        dosering: data.dosering.trim(),
        hoeveelheid: data.hoeveelheid.trim() || "—",
        reden: data.reden.trim(),
        notitie: data.notitie.trim() || undefined,
      });
    }
    setTimeout(() => setModalItem(null), 1150);
  }

  // Derive prefill from existing log when editing
  const modalPrefill: Partial<InnameFormFields> | undefined =
    modalItem && modalItem !== "new"
      ? {
          naam: modalItem.naam,
          datum: modalItem.date,
          tijdstip: modalItem.time,
          dosering: modalItem.dosering,
          hoeveelheid: modalItem.hoeveelheid !== "—" ? modalItem.hoeveelheid : "",
          reden: modalItem.reden,
          notitie: modalItem.notitie ?? "",
        }
      : undefined;

  // ── Schema handlers ───────────────────────────────────────────────────────────
  function handleSaveSchema(data: SchemaFormState) {
    if (schemaMode === "list" || schemaMode === "add") {
      addMedicatieSchema({
        id: crypto.randomUUID(),
        naam: data.naam,
        naamAnders: data.naamAnders,
        dosering: data.dosering,
        hoeveelheid: data.hoeveelheid,
        tijden: data.tijden,
        actief: data.actief,
        notitie: data.notitie,
      });
    } else {
      updateMedicatieSchema(schemaMode.edit.id, {
        naam: data.naam,
        naamAnders: data.naamAnders,
        dosering: data.dosering,
        hoeveelheid: data.hoeveelheid,
        tijden: data.tijden,
        actief: data.actief,
        notitie: data.notitie,
      });
    }
    setSchemaMode("list");
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Desktop: button in SectionHeader */}
      <div className="hidden sm:block">
        <SectionHeader
          title="Medicatie"
          subtitle="Overzicht van jouw pijnstilling en medicatiegebruik"
          action={
            <Button size="sm" onClick={() => setModalItem("new")}>
              <Plus size={15} /> Nieuwe inname
            </Button>
          }
        />
      </div>
      {/* Mobile: button below subtitle */}
      <div className="sm:hidden">
        <SectionHeader
          title="Medicatie"
          subtitle="Overzicht van jouw pijnstilling en medicatiegebruik"
        />
        <div className="mt-3">
          <Button size="sm" onClick={() => setModalItem("new")}>
            <Plus size={15} /> Nieuwe inname
          </Button>
        </div>
      </div>

      {/* Disclaimer */}
      <div
        className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm mt-5 mb-6"
        style={{ background: "#fffbeb", color: "#92400e" }}
      >
        <AlertCircle size={15} className="mt-0.5 shrink-0" style={{ color: "#d97706" }} />
        <p>
          Uitsluitend voor persoonlijke registratie.{" "}
          <strong>REVA geeft geen medisch advies.</strong> Raadpleeg altijd jouw arts of apotheker.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* Innames vandaag */}
        <div className="rounded-2xl border p-4" style={{ background: "#ffffff", borderColor: "#e8e5df" }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: "#fff3ee" }}>
            <Pill size={15} style={{ color: "#e8632a" }} />
          </div>
          <p className="text-2xl font-bold text-gray-900">{innamesVandaag}</p>
          <p className="text-xs text-gray-400 mt-0.5">Innames vandaag</p>
        </div>

        {/* Dagen met / zonder medicatie */}
        <div className="rounded-2xl border p-4" style={{ background: "#ffffff", borderColor: "#e8e5df" }}>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
            style={{ background: stat2Label === "Dagen zonder medicatie" ? "#fef9ec" : "#f0fdf4" }}
          >
            <CalendarCheck
              size={15}
              style={{ color: stat2Label === "Dagen zonder medicatie" ? "#d97706" : "#16a34a" }}
            />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stat2Value}</p>
          <p className="text-xs text-gray-400 mt-0.5">{stat2Label}</p>
        </div>

        {/* Actieve schema's */}
        <div className="rounded-2xl border p-4" style={{ background: "#ffffff", borderColor: "#e8e5df" }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: "#f5f3ff" }}>
            <ListChecks size={15} style={{ color: "#7c3aed" }} />
          </div>
          <p className="text-2xl font-bold text-gray-900">{activeSchemasCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">Actieve schema&apos;s</p>
        </div>
      </div>

      {/* Mobile tab switcher */}
      <div className="sm:hidden flex rounded-xl overflow-hidden mb-5" style={{ background: "#f3f0eb" }}>
        {(["overzicht", "schema"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className="flex-1 py-2.5 text-sm font-medium transition-all"
            style={{
              background: mobileTab === tab ? "#ffffff" : "transparent",
              color: mobileTab === tab ? "#1a1a1a" : "#9ca3af",
              borderRadius: "10px",
              margin: "3px",
              boxShadow: mobileTab === tab ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {tab === "overzicht" ? "Overzicht" : "Schema"}
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">

        {/* Left: Inname tracker */}
        <div className={`min-w-0 ${mobileTab !== "overzicht" ? "hidden sm:block" : ""}`}>
          {Object.keys(grouped).length === 0 ? (
            <div
              className="rounded-2xl border py-16 flex flex-col items-center gap-3"
              style={{ background: "#ffffff", borderColor: "#e8e5df" }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#f3f0eb" }}>
                <Pill size={20} style={{ color: "#c4bfb7" }} />
              </div>
              <p className="text-sm font-medium text-gray-400">Nog geen medicatie geregistreerd</p>
              <Button size="sm" onClick={() => setModalItem("new")}>
                <Plus size={14} /> Eerste inname toevoegen
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([dateKey, items]) => (
                <div key={dateKey}>
                  <div className="flex items-center gap-3 mb-3">
                    <p className="text-sm font-bold text-gray-900">{formatDate(dateKey)}</p>
                    <div className="flex-1 h-px" style={{ background: "#f0ede8" }} />
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: "#f3f0eb", color: "#a8a29e" }}
                    >
                      {items.length}×
                    </span>
                  </div>
                  <div className="space-y-2">
                    {items.map((med) => (
                      <LogItem
                        key={med.id}
                        med={med}
                        onEdit={() => setModalItem(med)}
                        onDelete={() => deleteMedicatie(med.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Medicatieschema */}
        <div className={`rounded-2xl overflow-hidden ${mobileTab !== "schema" ? "hidden sm:block" : ""}`} style={{ background: "#18181a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <div>
              <p className="text-sm font-semibold text-white">Medicatieschema</p>
              <p className="text-xs mt-0.5" style={{ color: "#7c7c8a" }}>Dagelijkse vaste inname-momenten</p>
            </div>
            {schemaMode !== "list" && (
              <button
                onClick={() => setSchemaMode("list")}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: "#7c7c8a" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {schemaMode === "list" && (
            <div
              className="flex items-center gap-2.5 px-5 py-3 border-b text-xs"
              style={{ borderColor: "rgba(255,255,255,0.07)", color: "#7c7c8a" }}
            >
              <Bell size={12} style={{ color: "#e8632a" }} />
              Herinneringen volgen op basis van jouw schema
            </div>
          )}

          {schemaMode === "list" ? (
            <div className="p-4 space-y-3">
              {medicatieSchemas.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <Bell size={18} style={{ color: "#52525e" }} />
                  </div>
                  <p className="text-sm font-medium text-center" style={{ color: "#7c7c8a" }}>
                    Je hebt nog geen medicatieschema ingesteld
                  </p>
                  <Button size="sm" onClick={() => setSchemaMode("add")}>
                    <Plus size={13} /> Voeg medicatie toe
                  </Button>
                </div>
              ) : (
                <>
                  {medicatieSchemas.map((schema) => (
                    <SchemaCard
                      key={schema.id}
                      schema={schema}
                      onToggle={() => updateMedicatieSchema(schema.id, { actief: !schema.actief })}
                      onEdit={() => setSchemaMode({ edit: schema })}
                      onDelete={() => deleteMedicatieSchema(schema.id)}
                    />
                  ))}
                  <Button fullWidth size="sm" onClick={() => setSchemaMode("add")}>
                    <Plus size={13} /> Voeg medicatie toe
                  </Button>
                </>
              )}
            </div>
          ) : (
            <SchemaForm
              initial={
                schemaMode !== "add"
                  ? {
                      naam: schemaMode.edit.naam,
                      naamAnders: schemaMode.edit.naamAnders,
                      dosering: schemaMode.edit.dosering,
                      hoeveelheid: schemaMode.edit.hoeveelheid,
                      tijden: schemaMode.edit.tijden,
                      actief: schemaMode.edit.actief,
                      notitie: schemaMode.edit.notitie,
                    }
                  : undefined
              }
              onSave={handleSaveSchema}
              onCancel={() => setSchemaMode("list")}
            />
          )}
        </div>
      </div>

      {/* Inname modal */}
      {modalItem !== null && (
        <InnameModal
          prefill={modalPrefill}
          onSave={handleSaveInname}
          onClose={() => setModalItem(null)}
          title={modalItem !== "new" ? "Inname bewerken" : "Nieuwe inname toevoegen"}
          saveLabel={modalItem !== "new" ? "Bijwerken" : "Opslaan"}
        />
      )}
    </div>
  );
}
