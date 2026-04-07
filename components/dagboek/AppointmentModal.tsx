"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { appointmentTypeLabel, type Appointment, type AppointmentType } from "@/lib/data";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppointmentModalProps {
  initialDate: string;
  initial?: Appointment;
  contactpersonen: { id: string; naam: string }[];
  onClose: () => void;
  onSave: (apt: Appointment) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return crypto.randomUUID();
}

const APPOINTMENT_TYPES: AppointmentType[] = [
  "fysio", "ziekenhuis", "nacontrole", "mri", "operatie", "second-opinion", "telefonisch",
];

// ─── Form primitives ──────────────────────────────────────────────────────────

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
      {children}
      {optional && (
        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full"
          style={{ background: "#f3f0eb", color: "#a8a29e" }}>Optioneel</span>
      )}
    </label>
  );
}

function FormInput({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full text-sm rounded-xl border px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-colors"
      style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }}
    />
  );
}

function FormTextarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full text-sm rounded-xl border px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-200 transition-colors"
      style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }}
    />
  );
}

function FormSelect({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-sm rounded-xl border px-3 py-2.5 focus:outline-none appearance-none"
      style={{
        borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        paddingRight: "36px",
      }}
    >
      {children}
    </select>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AppointmentModal({
  initialDate, initial, contactpersonen, onClose, onSave,
}: AppointmentModalProps) {
  const [title, setTitle]       = useState(initial?.title ?? "");
  const [type, setType]         = useState<AppointmentType>(initial?.type ?? "fysio");
  const [date, setDate]         = useState(initial?.date ?? initialDate);
  const [time, setTime]         = useState(initial?.time ?? "10:00");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [notities, setNotities] = useState(initial?.notities ?? "");
  const [submitted, setSubmitted] = useState(false);

  const initialBehandelaarSelect = (() => {
    const v = initial?.behandelaar ?? "";
    if (!v) return "";
    if (contactpersonen.some((c) => c.naam === v)) return v;
    return "__anders__";
  })();
  const [behandelaarSelect, setBehandelaarSelect] = useState(initialBehandelaarSelect);
  const [behandelaarAnders, setBehandelaarAnders] = useState(
    initialBehandelaarSelect === "__anders__" ? (initial?.behandelaar ?? "") : ""
  );
  const behandelaar = behandelaarSelect === "__anders__" ? behandelaarAnders : behandelaarSelect;

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSave() {
    setSubmitted(true);
    if (!title.trim() || !date || !time) return;
    onSave({
      id: initial?.id ?? uid(),
      title: title.trim(),
      type,
      date,
      time,
      location: location.trim(),
      behandelaar: behandelaar.trim(),
      notities: notities.trim(),
      herinnering: initial?.herinnering ?? true,
    });
  }

  const formBody = (
    <div className="space-y-4">
      <div>
        <FieldLabel>Titel *</FieldLabel>
        <FormInput
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Bijv. Fysio consult Nina Smits"
        />
        {submitted && !title.trim() && (
          <p className="text-xs text-red-400 mt-1">Vul een titel in</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Type</FieldLabel>
          <FormSelect value={type} onChange={(v) => setType(v as AppointmentType)}>
            {APPOINTMENT_TYPES.map((t) => (
              <option key={t} value={t}>{appointmentTypeLabel(t)}</option>
            ))}
          </FormSelect>
        </div>
        <div>
          <FieldLabel>Datum *</FieldLabel>
          <DatePicker value={date} onChange={setDate} placeholder="Kies een datum" />
          {submitted && !date && <p className="text-xs text-red-400 mt-1">Kies een datum</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Tijdstip *</FieldLabel>
          <TimePicker value={time} onChange={setTime} />
        </div>
        <div>
          <FieldLabel optional>Locatie</FieldLabel>
          <FormInput
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Bijv. FysioPlus Utrecht"
          />
        </div>
      </div>

      <div>
        <FieldLabel optional>Behandelaar</FieldLabel>
        <FormSelect value={behandelaarSelect} onChange={setBehandelaarSelect}>
          <option value="">— Geen behandelaar —</option>
          {contactpersonen.map((c) => (
            <option key={c.id} value={c.naam}>{c.naam}</option>
          ))}
          <option value="__anders__">Anders…</option>
        </FormSelect>
        {behandelaarSelect === "__anders__" && (
          <div className="mt-2">
            <FormInput
              value={behandelaarAnders}
              onChange={(e) => setBehandelaarAnders(e.target.value)}
              placeholder="Naam behandelaar"
            />
          </div>
        )}
      </div>

      <div>
        <FieldLabel optional>Notities</FieldLabel>
        <FormTextarea
          value={notities}
          onChange={(e) => setNotities(e.target.value)}
          rows={2}
          placeholder="Extra aandachtspunten..."
        />
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Desktop: centered modal */}
      <div
        className="hidden sm:flex items-center justify-center h-full p-4"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: "#ffffff",
            boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
            maxHeight: "calc(100vh - 2rem)",
            animation: "modalIn 0.18s ease",
          }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
            style={{ borderColor: "#f0ede8" }}>
            <p className="text-sm font-semibold text-gray-900">
              {initial ? "Afspraak bewerken" : "Afspraak inplannen"}
            </p>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100">
              <X size={15} className="text-gray-400" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 p-6">{formBody}</div>
          <div className="flex gap-2 justify-end px-6 py-4 border-t shrink-0"
            style={{ borderColor: "#f0ede8" }}>
            <Button variant="secondary" size="sm" onClick={onClose}>Annuleren</Button>
            <Button size="sm" onClick={handleSave}>Opslaan</Button>
          </div>
        </div>
      </div>

      {/* Mobile: bottom sheet */}
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
        <div className="flex justify-center pt-3 shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ background: "#e0ddd8" }} />
        </div>
        <div className="flex items-center justify-between px-5 py-3.5 shrink-0"
          style={{ borderBottom: "1px solid #f0ede8" }}>
          <p className="text-base font-semibold text-gray-900">
            {initial ? "Afspraak bewerken" : "Afspraak inplannen"}
          </p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center touch-press"
            style={{ background: "#f3f0eb" }}>
            <X size={15} className="text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-5">{formBody}</div>
        <div className="px-5 pb-5 pt-3 shrink-0" style={{ borderTop: "1px solid #f0ede8" }}>
          <button
            onClick={handleSave}
            className="w-full py-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 touch-press"
            style={{ background: "#e8632a", color: "#ffffff" }}
          >
            Opslaan
          </button>
        </div>
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
