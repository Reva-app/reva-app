"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DatePicker } from "@/components/ui/DatePicker";
import { useAppData } from "@/lib/store";
import { type CheckIn } from "@/lib/data";
import { Check, TrendingUp, Pencil, X, Lock } from "lucide-react";
import { useUserPlan } from "@/lib/hooks/useUserPlan";
import { canUseFullCheckIn } from "@/lib/featureGates";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function uid() {
  return crypto.randomUUID();
}

function getWeekDays(): { date: string; label: string; dayNum: number; fullLabel: string }[] {
  const now     = new Date();
  const dow     = now.getDay();
  const monday  = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  const labels  = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
  const full    = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];
  return labels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { date: dateStr, label, dayNum: d.getDate(), fullLabel: full[i] };
  });
}

function scoreColor(s: number) {
  if (s >= 4) return "#22c55e";
  if (s === 3) return "#f59e0b";
  return "#ef4444";
}
function scoreBg(s: number) {
  if (s >= 4) return "rgba(34,197,94,0.18)";
  if (s === 3) return "rgba(245,158,11,0.18)";
  return "rgba(239,68,68,0.18)";
}

const dagscoreLabels = ["", "Slecht", "Matig", "Redelijk", "Goed", "Uitstekend"];
const dagscoreEmoji  = ["", "😞", "😕", "😐", "🙂", "😊"];

// ─── Score selector ───────────────────────────────────────────────────────────

function ScoreSelector({ label, value, max, onChange, color = "#e8632a" }: {
  label: string; value: number; max: number; onChange: (v: number) => void; color?: string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-sm font-bold" style={{ color }}>{value}/{max}</p>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: max }, (_, i) => i + 1).map((v) => (
          <button key={v} onClick={() => onChange(v)}
            className="flex-1 h-9 rounded-lg text-sm font-medium transition-all"
            style={{ background: v <= value ? color : "#f3f0eb", color: v <= value ? "#ffffff" : "#9ca3af" }}>
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Hersteltrend lijn chart ──────────────────────────────────────────────────

function HerstelTrendLijn({ checkIns }: { checkIns: CheckIn[] }) {
  const recent = [...checkIns]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);

  // Compute average
  const avg = checkIns.length > 0
    ? (checkIns.reduce((s, ci) => s + ci.dagscore, 0) / checkIns.length).toFixed(1)
    : null;

  if (recent.length < 2) {
    return (
      <div className="rounded-2xl border bg-white p-6"
        style={{ borderColor: "#e8e5df", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-base font-semibold text-gray-900">Hersteltrend</p>
            <p className="text-xs text-gray-400 mt-0.5">Dagscore — laatste 14 dagen</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
            style={{ background: "#f3f0eb" }}>
            <TrendingUp size={15} className="text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-400">Nog te weinig check-ins</p>
          <p className="text-xs text-gray-300 mt-1">Vul meer check-ins in om je trend te zien</p>
        </div>
      </div>
    );
  }

  const VW = 600;
  const VH = 130;
  const PL = 30, PR = 16, PT = 12, PB = 28;
  const cW = VW - PL - PR;
  const cH = VH - PT - PB;
  const n  = recent.length;

  function xPos(i: number) { return PL + (n === 1 ? cW / 2 : (i / (n - 1)) * cW); }
  function yPos(score: number) { return PT + cH - ((score - 1) / 4) * cH; }

  const pts = recent.map((ci, i) => ({ x: xPos(i), y: yPos(ci.dagscore), ci }));
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${pts[n - 1].x.toFixed(1)} ${(PT + cH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(PT + cH).toFixed(1)} Z`;

  const labelSet = new Set<number>([0, n - 1]);
  if (n >= 7)  labelSet.add(Math.floor(n / 2));
  if (n >= 5)  labelSet.add(Math.floor(n / 4));
  if (n >= 10) labelSet.add(Math.floor((3 * n) / 4));

  return (
    <div className="rounded-2xl border bg-white px-6 pt-5 pb-4"
      style={{ borderColor: "#e8e5df", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-base font-semibold text-gray-900">Hersteltrend</p>
          <p className="text-xs text-gray-400 mt-0.5">Dagscore — laatste {recent.length} check-ins</p>
        </div>
        {avg !== null && (
          <div className="text-right">
            <p className="text-2xl font-bold leading-none" style={{ color: "#e8632a" }}>{avg}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">gemiddeld</p>
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#e8632a" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#e8632a" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y-axis grid + labels */}
        {[1, 2, 3, 4, 5].map((s) => {
          const y = yPos(s);
          return (
            <g key={s}>
              <line x1={PL} y1={y} x2={VW - PR} y2={y}
                stroke={s === 3 ? "#ede9e3" : "#f8f6f3"} strokeWidth="0.75" />
              <text x={PL - 6} y={y + 3.5} textAnchor="end" fontSize="9" fill="#c4bfb9">{s}</text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#trendGrad)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#e8632a" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />

        {/* Dots */}
        {pts.map((p, i) => {
          const isLast = i === n - 1;
          return (
            <g key={i}>
              {isLast && <circle cx={p.x} cy={p.y} r={7} fill="#e8632a" opacity="0.08" />}
              <circle cx={p.x} cy={p.y} r={isLast ? 3.5 : 2}
                fill={isLast ? "#e8632a" : "#ffffff"}
                stroke="#e8632a"
                strokeWidth={isLast ? 0 : 1.5}
                opacity={isLast ? 1 : 0.7} />
            </g>
          );
        })}

        {/* X-axis labels */}
        {pts.map((p, i) => {
          if (!labelSet.has(i)) return null;
          const d   = new Date(p.ci.date + "T12:00:00");
          const lbl = d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
          return (
            <text key={i} x={p.x} y={VH - 2} textAnchor="middle" fontSize="9" fill="#9ca3af">
              {lbl}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Vertical week overview (dark) ────────────────────────────────────────────

function WeekOverzichtVertical({
  checkIns,
  onEdit,
}: {
  checkIns: CheckIn[];
  onEdit: (ci: CheckIn) => void;
}) {
  const today    = todayStr();
  const weekDays = getWeekDays();

  const weekCIs  = weekDays.map((d) => checkIns.find((c) => c.date === d.date));
  const done     = weekCIs.filter(Boolean).length;

  return (
    <div className="rounded-2xl p-5 flex flex-col"
      style={{ background: "#18181a", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: "#f5f4f2" }}>Deze week</p>
          <p className="text-xs mt-0.5" style={{ color: "#7c7c8a" }}>
            {done} van 7 dagen ingevuld
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {weekDays.map((d, i) => {
            const ci = weekCIs[i];
            return (
              <div key={d.date}
                className="w-1.5 h-1.5 rounded-full transition-colors"
                style={{
                  background: ci
                    ? scoreColor(ci.dagscore)
                    : d.date === today
                    ? "rgba(232,99,42,0.4)"
                    : "rgba(255,255,255,0.1)",
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        {weekDays.map(({ date, label, dayNum }, i) => {
          const isToday  = date === today;
          const isFuture = date > today;
          const ci       = weekCIs[i];
          const score    = ci?.dagscore;

          return (
            <button
              key={date}
              onClick={() => ci && onEdit(ci)}
              disabled={!ci}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-left"
              style={{
                background: isToday
                  ? "#ffffff"
                  : ci
                  ? "rgba(255,255,255,0.92)"
                  : "rgba(255,255,255,0.07)",
                border: isToday
                  ? "1.5px solid #e8632a"
                  : ci
                  ? "1px solid rgba(255,255,255,0.15)"
                  : "1px solid rgba(255,255,255,0.05)",
                cursor: ci ? "pointer" : "default",
              }}
            >
              {/* Day */}
              <div className="shrink-0 w-8 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide leading-tight"
                  style={{ color: isToday ? "#e8632a" : "#6b7280" }}>
                  {label}
                </p>
                <p className="text-xs font-medium leading-tight"
                  style={{ color: isToday ? "#e8632a" : "#4b5563" }}>
                  {dayNum}
                </p>
              </div>

              {/* Status */}
              <div className="flex-1 min-w-0">
                {score !== undefined ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: scoreBg(score),
                        animation: "scaleIn 0.25s ease",
                      }}
                    >
                      <span className="text-[11px] font-bold" style={{ color: scoreColor(score) }}>
                        {score}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium leading-tight truncate"
                        style={{ color: scoreColor(score) }}>
                        {dagscoreLabels[score]}
                      </p>
                      <p className="text-[10px] leading-tight" style={{ color: "#4b5563" }}>
                        {score}/5
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs leading-tight"
                    style={{ color: isFuture ? "#374151" : "#4b5563" }}>
                    {isFuture ? "Toekomstig" : "Niet ingevuld"}
                  </p>
                )}
              </div>

              {ci && <Pencil size={10} style={{ color: "#4b5563", flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>

      <style>{`@keyframes scaleIn { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );
}

// ─── Check-in edit modal ──────────────────────────────────────────────────────

function CheckInEditModal({
  checkIn,
  onClose,
  onSave,
}: {
  checkIn: CheckIn;
  onClose: () => void;
  onSave: (ci: CheckIn) => void;
}) {
  const [dagscore,   setDagscore]   = useState(checkIn.dagscore);
  const [pijn,       setPijn]       = useState(checkIn.pijn);
  const [mobiliteit, setMobiliteit] = useState(checkIn.mobiliteit);
  const [energie,    setEnergie]    = useState(checkIn.energie);
  const [slaap,      setSlaap]      = useState(checkIn.slaap);
  const [stemming,   setStemming]   = useState(checkIn.stemming);
  const [notitie,    setNotitie]    = useState(checkIn.notitie ?? "");

  const dateLabel = new Date(checkIn.date + "T12:00:00").toLocaleDateString("nl-NL", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "#ffffff", boxShadow: "0 24px 64px rgba(0,0,0,0.18)", maxHeight: "calc(100vh - 2rem)", animation: "modalIn 0.18s ease" }}>

        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: "#f0ede8" }}>
          <div>
            <p className="text-sm font-semibold text-gray-900">Check-in bewerken</p>
            <p className="text-xs text-gray-400 mt-0.5 capitalize">{dateLabel}</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100">
            <X size={15} className="text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Dagscore */}
          <div>
            <div className="flex justify-between mb-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Dagscore</p>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} onClick={() => setDagscore(v)}
                  className="flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all"
                  style={{
                    background: dagscore === v ? "#1c1c1e" : "#f8f7f4",
                    border: dagscore === v ? "2px solid #e8632a" : "2px solid transparent",
                  }}>
                  <span className="text-lg">{dagscoreEmoji[v]}</span>
                  <span className="text-xs font-medium"
                    style={{ color: dagscore === v ? "#ffffff" : "#9ca3af" }}>
                    {dagscoreLabels[v]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-1 border-t" style={{ borderColor: "#f0ede8" }}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 pt-1">Details</p>
            <ScoreSelector label="Pijnniveau"     value={pijn}       max={10} onChange={setPijn}       color="#ef4444" />
            <ScoreSelector label="Mobiliteit"     value={mobiliteit} max={5}  onChange={setMobiliteit} color="#3b82f6" />
            <ScoreSelector label="Energie"        value={energie}    max={5}  onChange={setEnergie}    color="#f59e0b" />
            <ScoreSelector label="Slaapkwaliteit" value={slaap}      max={5}  onChange={setSlaap}      color="#8b5cf6" />
            <ScoreSelector label="Stemming"       value={stemming}   max={5}  onChange={setStemming}   color="#10b981" />
          </div>

          <div className="border-t pt-4" style={{ borderColor: "#f0ede8" }}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Notitie</p>
            <textarea
              value={notitie}
              onChange={(e) => setNotitie(e.target.value)}
              placeholder="Bijzonderheden, opmerkingen..."
              rows={3}
              className="w-full text-sm rounded-xl border px-4 py-3 resize-none focus:outline-none"
              style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end px-6 py-4 border-t shrink-0" style={{ borderColor: "#f0ede8" }}>
          <Button variant="secondary" size="sm" onClick={onClose}>Annuleren</Button>
          <Button size="sm" onClick={() => onSave({ ...checkIn, dagscore, pijn, mobiliteit, energie, slaap, stemming, notitie: notitie.trim() || undefined })}>
            <Check size={14} /> Opslaan
          </Button>
        </div>
      </div>
      <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.97) translateY(6px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
    </div>
  );
}

// ─── Locked score fields overlay ─────────────────────────────────────────────

/**
 * Shows the 5 extra score fields blurred with a Premium lock overlay.
 * Clicking opens the UpgradeModal.
 */
function LockedScoreFields({ onUnlock }: { onUnlock: () => void }) {
  const fields = [
    { label: "Pijnscore",      max: 10, value: 4, color: "#ef4444" },
    { label: "Mobiliteit",     max: 5,  value: 3, color: "#3b82f6" },
    { label: "Energie",        max: 5,  value: 3, color: "#f59e0b" },
    { label: "Slaapkwaliteit", max: 5,  value: 4, color: "#8b5cf6" },
    { label: "Stemming",       max: 5,  value: 3, color: "#10b981" },
  ];

  return (
    <div className="relative">
      {/* Blurred preview */}
      <div className="pointer-events-none select-none space-y-5 opacity-40 blur-[2px]">
        {fields.map((f) => (
          <div key={f.label}>
            <div className="flex justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">{f.label}</p>
              <p className="text-sm font-bold" style={{ color: f.color }}>{f.value}/{f.max}</p>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: f.max }, (_, i) => (
                <div
                  key={i}
                  className="flex-1 h-8 rounded-lg"
                  style={{
                    background: i < f.value
                      ? f.color
                      : "#f3f0eb",
                    opacity: i < f.value ? (0.4 + (i / f.max) * 0.6) : 1,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Lock overlay */}
      <button
        onClick={onUnlock}
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl"
        style={{ background: "rgba(255,255,255,0.8)" }}
      >
        <span
          className="flex items-center justify-center rounded-full w-10 h-10"
          style={{ background: "#f5f0e8" }}
        >
          <Lock className="w-5 h-5" style={{ color: "#c8975a" }} />
        </span>
        <p className="text-sm font-semibold text-gray-800">Uitgebreide check-ins met Premium</p>
        <span
          className="text-xs font-semibold px-3 py-1.5 rounded-lg"
          style={{ background: "#c8975a", color: "#ffffff" }}
        >
          Bekijk Premium
        </span>
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CheckInPage() {
  const { checkIns, addCheckIn, updateCheckIn } = useAppData();
  const planInfo = useUserPlan();
  const fullCheckIn = canUseFullCheckIn(planInfo);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [mobileTab, setMobileTab] = useState<"formulier" | "dezeweek">("formulier");

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [dagscore,   setDagscore]   = useState(3);
  const [pijn,       setPijn]       = useState(4);
  const [mobiliteit, setMobiliteit] = useState(3);
  const [energie,    setEnergie]    = useState(3);
  const [slaap,      setSlaap]      = useState(4);
  const [stemming,   setStemming]   = useState(3);
  const [notitie,    setNotitie]    = useState("");
  const [submitted,  setSubmitted]  = useState(false);

  const [editModal, setEditModal] = useState<CheckIn | null>(null);
  // id of the check-in currently being edited via the mobile form tab
  const [editingId, setEditingId] = useState<string | null>(null);

  const isToday = selectedDate === todayStr();

  function handleSubmit() {
    if (editingId) {
      // Editing an existing check-in via the mobile form tab
      const existing = checkIns.find((c) => c.id === editingId);
      if (existing) {
        updateCheckIn(editingId, { dagscore, pijn, mobiliteit, energie, slaap, stemming, notitie: notitie.trim() || undefined });
      }
    } else {
      addCheckIn({
        id: uid(),
        date: selectedDate,
        dagscore, pijn, mobiliteit, energie, slaap, stemming,
        zwelling: false,
        notitie: notitie.trim() || undefined,
        trainingGedaan: false,
        medicatieGebruikt: false,
      });
    }
    setSubmitted(true);
  }

  function reset() {
    setSelectedDate(todayStr());
    setDagscore(3); setPijn(4); setMobiliteit(3);
    setEnergie(3); setSlaap(4); setStemming(3);
    setNotitie(""); setSubmitted(false); setEditingId(null);
  }

  // Opens a past check-in in the mobile form tab for editing
  function handleMobileEdit(ci: CheckIn) {
    setSelectedDate(ci.date);
    setDagscore(ci.dagscore);
    setPijn(ci.pijn);
    setMobiliteit(ci.mobiliteit);
    setEnergie(ci.energie);
    setSlaap(ci.slaap);
    setStemming(ci.stemming);
    setNotitie(ci.notitie ?? "");
    setSubmitted(false);
    setEditingId(ci.id);
    setMobileTab("formulier");
  }

  // ── Shared form content (used on both desktop and mobile formulier tab) ──────
  const formContent = submitted ? (
    <div className="rounded-2xl border bg-white text-center py-10 px-6"
      style={{ borderColor: "#e8e5df", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: "#f0fdf4" }}>
        <Check size={24} style={{ color: "#22c55e" }} />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">Check-in opgeslagen</h3>
      <p className="text-sm text-gray-400">
        {new Date(selectedDate + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}
      </p>
      <p className="text-sm text-gray-400 mt-0.5">
        Dagscore {dagscore}/5 — {dagscoreLabels[dagscore]}
      </p>
      <Button variant="secondary" size="sm" className="mt-5" onClick={reset}>
        Nieuwe check-in
      </Button>
    </div>
  ) : (
    <>
      <div className="rounded-2xl border bg-white"
        style={{ borderColor: "#e8e5df", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>

        {/* Datum */}
        <div className="px-6 pt-6 pb-5 border-b" style={{ borderColor: "#f0ede8" }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Datum</p>
          <DatePicker value={selectedDate} onChange={setSelectedDate} />
          {!isToday && (
            <p className="text-xs text-gray-400 mt-2">Je vult een check-in in voor een eerdere dag</p>
          )}
        </div>

        {/* Dagscore */}
        <div className="px-6 pt-5 pb-5 border-b" style={{ borderColor: "#f0ede8" }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
            {isToday ? "Dagscore van vandaag" : "Dagscore"}
          </p>
          <p className="text-sm text-gray-500 mb-3">
            {isToday
              ? "Hoe was jouw dag overall?"
              : `Hoe was jouw dag op ${new Date(selectedDate + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}?`}
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} onClick={() => setDagscore(v)}
                className="flex-1 py-4 rounded-xl flex flex-col items-center gap-1.5 transition-all"
                style={{
                  background: dagscore === v ? "#1c1c1e" : "#f8f7f4",
                  border: dagscore === v ? "2px solid #e8632a" : "2px solid transparent",
                }}>
                <span className="text-xl">{dagscoreEmoji[v]}</span>
                <span className="text-xs font-medium"
                  style={{ color: dagscore === v ? "#ffffff" : "#9ca3af" }}>
                  {dagscoreLabels[v]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="px-6 pt-5 pb-5 border-b" style={{ borderColor: "#f0ede8" }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Details</p>
          <p className="text-sm text-gray-500 mb-4">
            {fullCheckIn ? "Optioneel — vul in wat relevant is" : "Beschikbaar met Premium"}
          </p>
          <div className="space-y-5">
            <ScoreSelector label="Dagscore" value={dagscore} max={5} onChange={setDagscore} color="#e8632a" />
            {fullCheckIn ? (
              <>
                <div>
                  <ScoreSelector label="Pijnscore"   value={pijn}       max={10} onChange={setPijn}       color="#ef4444" />
                  <p className="text-[11px] mt-1.5 px-0.5" style={{ color: "#ef4444" }}>
                    Let op: 1 = weinig pijn &nbsp;·&nbsp; 10 = veel pijn
                  </p>
                </div>
                <ScoreSelector label="Mobiliteit"    value={mobiliteit} max={5}  onChange={setMobiliteit} color="#3b82f6" />
                <ScoreSelector label="Energie"       value={energie}    max={5}  onChange={setEnergie}    color="#f59e0b" />
                <ScoreSelector label="Slaapkwaliteit" value={slaap}     max={5}  onChange={setSlaap}      color="#8b5cf6" />
                <ScoreSelector label="Stemming"      value={stemming}   max={5}  onChange={setStemming}   color="#10b981" />
              </>
            ) : (
              <LockedScoreFields onUnlock={() => setShowUpgradeModal(true)} />
            )}
          </div>
        </div>

        {/* Notitie */}
        <div className="px-6 pt-5 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Notitie</p>
          <p className="text-sm text-gray-500 mb-3">Optioneel</p>
          <textarea
            value={notitie}
            onChange={(e) => setNotitie(e.target.value)}
            placeholder="Hoe voelde jouw herstel vandaag? Bijzonderheden, opmerkingen..."
            rows={4}
            className="w-full text-sm rounded-xl border px-4 py-3 resize-none focus:outline-none"
            style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }}
          />
        </div>
      </div>

      <Button fullWidth size="lg" onClick={handleSubmit}>
        Check-in opslaan
      </Button>
    </>
  );

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <SectionHeader
        title="Dagelijkse Check-in"
        subtitle="Hoe gaat het vandaag met jouw herstel?"
      />

      {/* ── Mobile: hersteltrend boven tabs ─────────────────────────────── */}
      <div className="sm:hidden">
        <HerstelTrendLijn checkIns={checkIns} />
      </div>

      {/* ── Mobile: tab bar ──────────────────────────────────────────────── */}
      <div className="sm:hidden">
        <div className="flex rounded-xl overflow-hidden mb-5" style={{ background: "#f3f0eb" }}>
          {(["formulier", "dezeweek"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className="flex-1 py-2.5 text-sm font-medium transition-all"
              style={{
                background: mobileTab === tab ? "#ffffff" : "transparent",
                color: mobileTab === tab ? "#1a1a1a" : "#9ca3af",
                boxShadow: mobileTab === tab ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                margin: mobileTab === tab ? "3px" : "0",
                borderRadius: mobileTab === tab ? "8px" : "0",
              }}
            >
              {tab === "formulier" ? "Check-in formulier" : "Deze week"}
            </button>
          ))}
        </div>

        {mobileTab === "formulier" && (
          <div className="space-y-5">
            {submitted ? (
              <div className="rounded-2xl border bg-white text-center py-10 px-6"
                style={{ borderColor: "#e8e5df", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: "#f0fdf4" }}>
                  <Check size={24} style={{ color: "#22c55e" }} />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Check-in opgeslagen</h3>
                <p className="text-sm text-gray-400">
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <p className="text-sm text-gray-400 mt-0.5">
                  Dagscore {dagscore}/5 — {dagscoreLabels[dagscore]}
                </p>
                <Button variant="secondary" size="sm" className="mt-5" onClick={reset}>
                  Nieuwe check-in
                </Button>
              </div>
            ) : (
              <>
                {/* Context banner when editing a past check-in */}
                {editingId && (
                  <div className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ background: "#fff8f5", border: "1px solid #fcd9c8" }}>
                    <p className="text-xs font-medium" style={{ color: "#e8632a" }}>
                      Check-in bewerken —{" "}
                      {new Date(selectedDate + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                    <button onClick={reset} className="text-xs underline underline-offset-2" style={{ color: "#e8632a" }}>
                      Annuleren
                    </button>
                  </div>
                )}

                {/* Uitleg — matches CheckInModal */}
                {!editingId && (
                  <p className="text-xs text-gray-400 leading-relaxed px-1">
                    Vul in hoe je dag was. Bij alle scores geldt: <strong className="text-gray-500">1 is laag</strong> en de hoogste waarde is het beste — behalve bij pijn, waar lager beter is.
                  </p>
                )}

                {/* Datum — alleen bij nieuwe check-in */}
                {!editingId && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Datum</label>
                  <DatePicker value={selectedDate} onChange={setSelectedDate} />
                </div>
                )}

                <ScoreSelector label="Dagscore" value={dagscore} max={5} onChange={setDagscore} color="#e8632a" />
                {fullCheckIn ? (
                  <>
                    <div>
                      <ScoreSelector label="Pijnscore"    value={pijn}       max={10} onChange={setPijn}       color="#ef4444" />
                      <p className="text-[11px] mt-1.5 px-0.5" style={{ color: "#ef4444" }}>
                        Let op: 1 = weinig pijn &nbsp;·&nbsp; 10 = veel pijn
                      </p>
                    </div>
                    <ScoreSelector label="Mobiliteit"     value={mobiliteit} max={5}  onChange={setMobiliteit} color="#3b82f6" />
                    <ScoreSelector label="Energie"        value={energie}    max={5}  onChange={setEnergie}    color="#f59e0b" />
                    <ScoreSelector label="Slaapkwaliteit" value={slaap}      max={5}  onChange={setSlaap}      color="#8b5cf6" />
                    <ScoreSelector label="Stemming"       value={stemming}   max={5}  onChange={setStemming}   color="#10b981" />
                  </>
                ) : (
                  <LockedScoreFields onUnlock={() => setShowUpgradeModal(true)} />
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Notitie <span className="text-[10px] font-normal text-gray-400 italic">optioneel</span>
                  </label>
                  <textarea
                    value={notitie}
                    onChange={(e) => setNotitie(e.target.value)}
                    placeholder="Hoe was je dag?"
                    rows={3}
                    className="w-full text-sm rounded-xl border px-4 py-3 resize-none focus:outline-none"
                    style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }}
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  className="w-full py-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 touch-press"
                  style={{ background: "#e8632a", color: "#ffffff" }}
                >
                  {editingId ? "Wijzigingen opslaan" : "Check-in opslaan"}
                </button>
              </>
            )}
          </div>
        )}

        {mobileTab === "dezeweek" && (
          <div className="space-y-5">
            <WeekOverzichtVertical checkIns={checkIns} onEdit={handleMobileEdit} />
          </div>
        )}
      </div>

      {/* ── Desktop: original two-column layout ──────────────────────────── */}
      <div className="hidden sm:block space-y-6">
        <HerstelTrendLijn checkIns={checkIns} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-5">
            {formContent}
          </div>
          <div>
            <WeekOverzichtVertical checkIns={checkIns} onEdit={(ci) => setEditModal(ci)} />
          </div>
        </div>
      </div>

      {/* ── Edit modal ───────────────────────────────────────────────────── */}
      {editModal && (
        <CheckInEditModal
          checkIn={editModal}
          onClose={() => setEditModal(null)}
          onSave={(ci) => {
            updateCheckIn(ci.id, ci);
            setEditModal(null);
          }}
        />
      )}

      {showUpgradeModal && (
        <UpgradeModal feature="checkIn" onClose={() => setShowUpgradeModal(false)} />
      )}
    </div>
  );
}
