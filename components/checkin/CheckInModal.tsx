"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import type { CheckIn } from "@/lib/data";
import { DatePicker } from "@/components/ui/DatePicker";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Score row ────────────────────────────────────────────────────────────────

function ScoreRow({
  label,
  value,
  max,
  onChange,
  color = "#e8632a",
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
  color?: string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className="text-xs font-bold" style={{ color }}>
          {value}/{max}
        </span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => i + 1).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className="flex-1 h-9 rounded-xl text-xs font-medium transition-all touch-press"
            style={{
              background: v <= value ? color : "#f3f0eb",
              color: v <= value ? "#ffffff" : "#9ca3af",
            }}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CheckInModalProps {
  /** If provided, prefills the form and updates on save */
  existing?: CheckIn;
  /** Date string "YYYY-MM-DD" to prefill the date field */
  initialDate?: string;
  onClose: () => void;
  /** Called with the complete CheckIn object to be saved */
  onSave: (ci: CheckIn) => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CheckInModal({
  existing,
  initialDate,
  onClose,
  onSave,
}: CheckInModalProps) {
  const defaultDate = existing?.date ?? initialDate ?? todayStr();

  const [date,       setDate]       = useState(defaultDate);
  const [dagscore,   setDagscore]   = useState(existing?.dagscore   ?? 3);
  const [pijn,       setPijn]       = useState(existing?.pijn       ?? 4);
  const [mobiliteit, setMobiliteit] = useState(existing?.mobiliteit ?? 3);
  const [energie,    setEnergie]    = useState(existing?.energie    ?? 3);
  const [slaap,      setSlaap]      = useState(existing?.slaap      ?? 3);
  const [stemming,   setStemming]   = useState(existing?.stemming   ?? 3);
  const [notitie,    setNotitie]    = useState(existing?.notitie    ?? "");
  const [saved,      setSaved]      = useState(false);

  function handleSave() {
    const ci: CheckIn = {
      id: existing?.id ?? crypto.randomUUID(),
      date,
      dagscore,
      pijn,
      mobiliteit,
      energie,
      slaap,
      stemming,
      zwelling:          existing?.zwelling          ?? false,
      trainingGedaan:    existing?.trainingGedaan    ?? false,
      medicatieGebruikt: existing?.medicatieGebruikt ?? false,
      notitie: notitie.trim() || undefined,
    };
    onSave(ci);
    setSaved(true);
    setTimeout(onClose, 900);
  }

  const title = existing ? "Check-in bewerken" : "Check-in invullen";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60]"
        style={{ background: "rgba(0,0,0,0.45)", animation: "fadeIn 0.18s ease" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[60] rounded-t-2xl flex flex-col"
        style={{
          background: "#ffffff",
          boxShadow: "0 -12px 48px rgba(0,0,0,0.18)",
          animation: "sheetUp 0.3s cubic-bezier(0.32,0.72,0,1)",
          maxHeight: "92vh",
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

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4 bottom-sheet-content">

          {/* Uitleg */}
          <p className="text-xs text-gray-400 leading-relaxed">
            Vul in hoe je dag was. Bij alle scores geldt: <strong className="text-gray-500">1 is laag</strong> en de hoogste waarde is het beste — behalve bij pijn, waar lager beter is.
          </p>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Datum</label>
            <DatePicker value={date} onChange={setDate} />
          </div>

          <ScoreRow label="Dagscore"   value={dagscore}   max={5}  onChange={setDagscore}   color="#e8632a" />

          <div>
            <ScoreRow label="Pijnscore" value={pijn} max={10} onChange={setPijn} color="#ef4444" />
            <p className="text-[11px] mt-1.5 px-0.5" style={{ color: "#ef4444" }}>
              Let op: 1 = weinig pijn &nbsp;·&nbsp; 10 = veel pijn
            </p>
          </div>

          <ScoreRow label="Mobiliteit"    value={mobiliteit} max={5}  onChange={setMobiliteit} color="#3b82f6" />
          <ScoreRow label="Energie"       value={energie}    max={5}  onChange={setEnergie}    color="#f59e0b" />
          <ScoreRow label="Slaapkwaliteit" value={slaap}     max={5}  onChange={setSlaap}      color="#8b5cf6" />
          <ScoreRow label="Stemming"      value={stemming}   max={5}  onChange={setStemming}   color="#ec4899" />

          {/* Notitie */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className="text-xs font-medium text-gray-500">Notitie</label>
              <span className="text-[10px] text-gray-400 italic">optioneel</span>
            </div>
            <textarea
              value={notitie}
              onChange={(e) => setNotitie(e.target.value)}
              placeholder="Hoe was je dag?"
              rows={3}
              className="w-full text-sm rounded-xl border px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
              style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }}
            />
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            className="w-full py-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all touch-press"
            style={{
              background: saved ? "#16a34a" : "#e8632a",
              color: "#ffffff",
              animation: saved ? "successPop 0.3s ease" : undefined,
              pointerEvents: saved ? "none" : undefined,
            }}
          >
            {saved ? (
              <><Check size={16} strokeWidth={2.5} /> Opgeslagen!</>
            ) : (
              existing ? "Check-in bijwerken" : "Check-in opslaan"
            )}
          </button>
        </div>
      </div>
    </>
  );
}
