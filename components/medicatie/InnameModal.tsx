"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { X, Check } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export const MEDICATIE_OPTIES = [
  "Paracetamol",
  "Ibuprofen",
  "Naproxen",
  "Diclofenac",
  "Oxycodon",
  "Tramadol",
  "Anders",
];

export const MED_KLEUREN: Record<string, string> = {
  Paracetamol: "#3b82f6",
  Ibuprofen: "#f59e0b",
  Naproxen: "#8b5cf6",
  Diclofenac: "#10b981",
  Oxycodon: "#ef4444",
  Tramadol: "#ec4899",
  Anders: "#6b7280",
};

export function getMedColor(naam: string): string {
  return MED_KLEUREN[naam] ?? "#6b7280";
}

export type InnameFormFields = {
  naam: string;
  naamAnders: string;
  datum: string;
  tijdstip: string;
  dosering: string;
  hoeveelheid: string;
  reden: string;
  notitie: string;
};

// Import from shared util + re-export voor backwards-compat
import { todayStr, nowTimeStr } from "@/lib/dateUtils";
export { todayStr, nowTimeStr };

// ─── Shared form primitives ───────────────────────────────────────────────────

export function FieldLabel({
  children,
  optional,
}: {
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
      {children}
      {optional && (
        <span
          className="text-[10px] font-normal px-1.5 py-0.5 rounded-full"
          style={{ background: "#f3f0eb", color: "#a8a29e" }}
        >
          Optioneel
        </span>
      )}
    </label>
  );
}

export function FormInput({
  value,
  onChange,
  placeholder,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none transition-colors"
      style={{
        borderColor: error ? "#fca5a5" : "#e8e5df",
        background: "#f8f7f4",
        color: "#1a1a1a",
      }}
    />
  );
}

export function MedPillButtons({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {MEDICATIE_OPTIES.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
          style={{
            background: value === opt ? getMedColor(opt) : "#f8f7f4",
            borderColor: value === opt ? getMedColor(opt) : "#e8e5df",
            color: value === opt ? "#ffffff" : "#6b7280",
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─── Pure form fields (shared between desktop and mobile) ─────────────────────

function InnameFormFields({
  fields,
  setField,
  submitted,
}: {
  fields: InnameFormFields;
  setField: <K extends keyof InnameFormFields>(k: K, v: InnameFormFields[K]) => void;
  submitted: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        <FieldLabel>Medicatie</FieldLabel>
        <MedPillButtons value={fields.naam} onChange={(v) => setField("naam", v)} />
      </div>

      {fields.naam === "Anders" && (
        <div>
          <FieldLabel>Vul medicatie in</FieldLabel>
          <FormInput
            value={fields.naamAnders}
            onChange={(v) => setField("naamAnders", v)}
            placeholder="Bijvoorbeeld: Pregabaline"
            error={submitted && !fields.naamAnders.trim()}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Datum</FieldLabel>
          <DatePicker value={fields.datum} onChange={(v) => setField("datum", v)} />
        </div>
        <div>
          <FieldLabel>Tijdstip</FieldLabel>
          <TimePicker value={fields.tijdstip} onChange={(v) => setField("tijdstip", v)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Dosering *</FieldLabel>
          <FormInput
            value={fields.dosering}
            onChange={(v) => setField("dosering", v)}
            placeholder="bijv. 500mg"
            error={submitted && !fields.dosering.trim()}
          />
        </div>
        <div>
          <FieldLabel optional>Hoeveelheid</FieldLabel>
          <FormInput
            value={fields.hoeveelheid}
            onChange={(v) => setField("hoeveelheid", v)}
            placeholder="bijv. 2 tabletten"
          />
        </div>
      </div>

      <div>
        <FieldLabel>Reden van inname</FieldLabel>
        <FormInput
          value={fields.reden}
          onChange={(v) => setField("reden", v)}
          placeholder="bijv. Pijn knie na training"
          error={submitted && !fields.reden.trim()}
        />
      </div>

      <div>
        <FieldLabel optional>Notitie</FieldLabel>
        <textarea
          value={fields.notitie}
          onChange={(e) => setField("notitie", e.target.value)}
          placeholder="Bijzonderheden, effecten..."
          rows={2}
          className="w-full text-sm rounded-xl border px-4 py-2.5 resize-none focus:outline-none"
          style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }}
        />
      </div>
    </div>
  );
}

// ─── Desktop form body (header + fields + footer buttons) ─────────────────────

function InnameFormBody({
  fields,
  setField,
  submitted,
  onCancel,
  onSave,
  title,
  saveLabel = "Opslaan",
  saved,
}: {
  fields: InnameFormFields;
  setField: <K extends keyof InnameFormFields>(k: K, v: InnameFormFields[K]) => void;
  submitted: boolean;
  onCancel: () => void;
  onSave: () => void;
  title: string;
  saveLabel?: string;
  saved: boolean;
}) {
  const canSave =
    fields.dosering.trim() &&
    fields.reden.trim() &&
    (fields.naam !== "Anders" || fields.naamAnders.trim());

  return (
    <>
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "#f0ede8" }}
      >
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <button
          onClick={onCancel}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <X size={15} className="text-gray-400" />
        </button>
      </div>

      {saved ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: "#f0fdf4" }}
          >
            <Check size={22} style={{ color: "#22c55e" }} />
          </div>
          <p className="text-sm font-semibold text-gray-800">Inname opgeslagen</p>
        </div>
      ) : (
        <div className="p-6 space-y-5">
          <InnameFormFields fields={fields} setField={setField} submitted={submitted} />
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" size="sm" onClick={onCancel}>
              Annuleren
            </Button>
            <Button size="sm" onClick={onSave} disabled={submitted && !canSave}>
              {saveLabel}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Modal wrapper (fixed overlay) ───────────────────────────────────────────

export function InnameModal({
  prefill,
  onSave,
  onClose,
  title = "Nieuwe inname toevoegen",
  saveLabel = "Opslaan",
}: {
  prefill?: Partial<InnameFormFields>;
  onSave: (data: InnameFormFields) => void;
  onClose: () => void;
  title?: string;
  saveLabel?: string;
}) {
  const [fields, setFields] = useState<InnameFormFields>({
    naam: "Paracetamol",
    naamAnders: "",
    datum: todayStr(),
    tijdstip: nowTimeStr(),
    dosering: "",
    hoeveelheid: "",
    reden: "Volgens het schema",
    notitie: "",
    ...prefill,
  });
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);

  function setField<K extends keyof InnameFormFields>(k: K, v: InnameFormFields[K]) {
    setFields((prev) => ({ ...prev, [k]: v }));
  }

  const canSave =
    fields.dosering.trim() &&
    fields.reden.trim() &&
    (fields.naam !== "Anders" || fields.naamAnders.trim());

  function handleSave() {
    setSubmitted(true);
    if (!canSave) return;
    setSaved(true);
    setTimeout(() => onSave(fields), 1100);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Desktop: centered modal — unchanged */}
      <div
        className="hidden sm:flex items-center justify-center h-full p-4"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="w-full max-w-lg rounded-2xl overflow-hidden"
          style={{
            background: "#ffffff",
            boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
            animation: "modalIn 0.18s ease",
          }}
        >
          <InnameFormBody
            fields={fields}
            setField={setField}
            submitted={submitted}
            onCancel={onClose}
            onSave={handleSave}
            title={title}
            saveLabel={saveLabel}
            saved={saved}
          />
        </div>
      </div>

      {/* Mobile: bottom sheet — matches AppointmentModal pattern exactly */}
      <div
        className="sm:hidden fixed left-0 right-0 bottom-0 rounded-t-2xl flex flex-col overflow-hidden"
        style={{
          background: "#ffffff",
          boxShadow: "0 -12px 48px rgba(0,0,0,0.18)",
          animation: "sheetUp 0.3s cubic-bezier(0.32,0.72,0,1)",
          maxHeight: "92vh",
          paddingBottom: "calc(var(--nav-height) + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ background: "#e0ddd8" }} />
        </div>
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 shrink-0"
          style={{ borderBottom: "1px solid #f0ede8" }}
        >
          <p className="text-base font-semibold text-gray-900">{title}</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center touch-press"
            style={{ background: "#f3f0eb" }}
          >
            <X size={15} className="text-gray-500" />
          </button>
        </div>

        {saved ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3 flex-1">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "#f0fdf4" }}
            >
              <Check size={22} style={{ color: "#22c55e" }} />
            </div>
            <p className="text-sm font-semibold text-gray-800">Inname opgeslagen</p>
          </div>
        ) : (
          <>
            {/* Scrollable form fields */}
            <div className="overflow-y-auto flex-1 px-5 py-5">
              <InnameFormFields fields={fields} setField={setField} submitted={submitted} />
            </div>
            {/* Pinned orange save button — matches Afspraak, Check-in, Training */}
            <div className="px-5 pb-5 pt-3 shrink-0" style={{ borderTop: "1px solid #f0ede8" }}>
              <button
                onClick={handleSave}
                className="w-full py-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 touch-press"
                style={{ background: "#e8632a", color: "#ffffff" }}
              >
                {saveLabel}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.97) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
