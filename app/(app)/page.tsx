"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck, Calendar, Dumbbell, Pill, FileText, Image,
  ArrowRight, Clock, MapPin, Check, ChevronRight, Plus,
  Target, Trophy, TrendingUp, X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useAppData } from "@/lib/store";
import {
  appointmentTypeLabel, type AppointmentType,
  type Appointment, type DagboekWorkout, type MedicatieLog, type DossierDocument,
  type DocumentType, type CheckIn,
} from "@/lib/data";
import { generateCoachInsights } from "@/lib/coach";
import dynamic from "next/dynamic";
import type { InnameFormFields } from "@/components/medicatie/InnameModal";

// ─── Lazy-loaded modals ────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CheckInModal = dynamic<any>(
  () => import("@/components/checkin/CheckInModal").then((m) => ({ default: m.CheckInModal })),
  { ssr: false }
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AppointmentModal = dynamic<any>(
  () => import("@/components/dagboek/AppointmentModal").then((m) => ({ default: m.AppointmentModal })),
  { ssr: false }
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const InnameModal = dynamic<any>(
  () => import("@/components/medicatie/InnameModal").then((m) => ({ default: m.InnameModal })),
  { ssr: false }
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TrainingModal = dynamic<any>(
  () => import("@/components/training/TrainingModal").then((m) => ({ default: m.TrainingModal })),
  { ssr: false }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BLESSURE_LABELS: Record<string, string> = {
  acl: "ACL blessure", meniscus: "meniscus blessure", enkel: "enkelverstuiking",
  spier: "spierverrekking", hamstring: "hamstring blessure", schouder: "schouderblessure",
  knieband: "knieband blessure", pees: "peesontsteking", rug: "rugblessure",
  achilles: "achillespees blessure", patella: "kniepees blessure", anders: "blessure",
};

function blessureLabel(type: string, anders: string) {
  if (type === "anders" && anders) return anders;
  return BLESSURE_LABELS[type] ?? type;
}

function greeting(hour: number, voornaam: string): string {
  const name = voornaam ? `, ${voornaam}` : "";
  if (hour >= 5  && hour < 12) return `Goedemorgen${name}`;
  if (hour >= 12 && hour < 18) return `Goedemiddag${name}`;
  if (hour >= 18 && hour < 23) return `Goedenavond${name}`;
  return `Goede nacht${name}`;
}

type Trend = "stijgend" | "dalend" | "stabiel" | "geen";

function computeTrend(scores: number[]): Trend {
  if (scores.length < 4) return "geen";
  const mid = Math.floor(scores.length / 2);
  const earlyAvg = scores.slice(0, mid).reduce((s, v) => s + v, 0) / mid;
  const lateAvg  = scores.slice(mid).reduce((s, v) => s + v, 0) / (scores.length - mid);
  if (lateAvg > earlyAvg + 0.3) return "stijgend";
  if (lateAvg < earlyAvg - 0.3) return "dalend";
  return "stabiel";
}

function contextMotivatie(score: number | null, trend: Trend, checkInVandaag: boolean, trainedToday: boolean): string {
  if (!checkInVandaag) {
    if (trend === "stijgend") return "Je herstel laat vooruitgang zien. Hoe gaat het vandaag?";
    return "Hoe gaat het vandaag met je herstel?";
  }
  if (score !== null) {
    if (score <= 2) return "Vandaag is een nieuwe kans. Kleine stappen zijn ook vooruitgang.";
    if (score === 3) {
      if (trend === "dalend") return "Je lichaam geeft signalen. Neem vandaag bewust de tijd.";
      return "Je bent op de goede weg. Blijf dit ritme vasthouden.";
    }
    if (score >= 4) {
      if (trend === "stijgend") return "Je herstel laat duidelijk vooruitgang zien. Ga zo door.";
      if (trainedToday) return "Sterk bezig. Training én een goede score — dat is herstel.";
      return "Sterk bezig. Je herstel zit duidelijk in een goede flow.";
    }
  }
  if (trend === "stijgend") return "Je herstel laat vooruitgang zien. Ga zo door.";
  if (trend === "dalend")  return "Je lichaam geeft signalen. Neem vandaag bewust de tijd.";
  return "Geduld is ook een vorm van kracht.";
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekDates(): string[] {
  const now    = new Date();
  const dow    = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
}

function fmtShort(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}
function fmtLong(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}
const SCORE_LABELS  = ["", "Slecht", "Matig", "Redelijk", "Goed", "Uitstekend"];
const SCORE_COLORS  = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];

function scoreColor(s: number)  { return SCORE_COLORS[Math.min(5, Math.max(1, s))] ?? "#9ca3af"; }

type QuickModal = "checkin" | "afspraak" | "training" | "medicatie" | "document" | null;

type FocusKind = "afspraak" | "training" | "medicatie" | "checkin" | "doel";
interface FocusCardData {
  kind: FocusKind;
  color: string;
  bg: string;
  icon: React.ElementType;
  microcopy: string;
  title: string;
  details: { icon?: React.ElementType; value: string }[];
  cta: string;
  ctaHref?: string;
  ctaModal?: NonNullable<QuickModal>;
}

function StatusPill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full leading-none"
      style={{ background: bg, color }}>
      {label}
    </span>
  );
}

const APT_BADGE: Record<AppointmentType, "default" | "blue" | "warning" | "danger" | "purple" | "muted"> = {
  ziekenhuis: "blue", fysio: "muted", mri: "purple", operatie: "danger",
  nacontrole: "warning", "second-opinion": "blue", telefonisch: "default",
};

// ─── Shared UI ────────────────────────────────────────────────────────────────

function RowLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#b5b0a8" }}>
      {children}
    </p>
  );
}

function Panel({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`rounded-2xl border overflow-hidden ${className}`}
      style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", ...style }}>
      {children}
    </div>
  );
}

function PanelHeader({ title, cta, href }: { title: string; cta?: string; href?: string }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-4">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {cta && href && (
        <Link href={href} className="text-xs font-medium flex items-center gap-1" style={{ color: "#e8632a" }}>
          {cta} <ArrowRight size={11} />
        </Link>
      )}
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-gray-400 px-5 pb-5">{children}</p>;
}

function FormLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-gray-500 mb-1">{children}</label>;
}
function FormInput({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="w-full text-sm rounded-xl border px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-colors"
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

function DashModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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
        style={{ background: "#ffffff", boxShadow: "0 24px 64px rgba(0,0,0,0.18)", maxHeight: "calc(100vh - 2rem)", animation: "modalIn 0.18s ease" }}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b shrink-0" style={{ borderColor: "#f0ede8" }}>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100">
            <X size={15} className="text-gray-400" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4">{children}</div>
      </div>
      <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.97) translateY(6px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
    </div>
  );
}

function SaveBtn({ onClick, children, saved }: { onClick: () => void; children: React.ReactNode; saved?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
      style={{
        background: saved ? "#16a34a" : "#1c1c1e",
        animation: saved ? "successPop 0.3s ease" : undefined,
        pointerEvents: saved ? "none" : undefined,
      }}
    >
      {saved ? <><Check size={14} strokeWidth={2.5} /> Opgeslagen!</> : children}
    </button>
  );
}

// ─── Quick modal: Afspraak ────────────────────────────────────────────────────

const APPOINTMENT_TYPES: AppointmentType[] = ["fysio", "ziekenhuis", "nacontrole", "mri", "operatie", "second-opinion", "telefonisch"];

function AfspraakQuickModal({ onClose, addAppointment, today }: {
  onClose: () => void;
  addAppointment: (apt: Appointment) => void;
  today: string;
}) {
  const [title, setTitle]       = useState("");
  const [type, setType]         = useState<AppointmentType>("fysio");
  const [date, setDate]         = useState(today);
  const [time, setTime]         = useState("09:00");
  const [location, setLocation] = useState("");
  const [saved, setSaved]       = useState(false);

  function save() {
    if (!title.trim()) return;
    addAppointment({ id: crypto.randomUUID(), title: title.trim(), type, date, time, location, behandelaar: "", herinnering: false });
    setSaved(true);
    setTimeout(onClose, 900);
  }

  return (
    <DashModalShell title="Afspraak toevoegen" onClose={onClose}>
      <div>
        <FormLabel>Titel</FormLabel>
        <FormInput value={title} onChange={e => setTitle(e.target.value)} placeholder="Bijv. Fysiotherapie Nina Smits" />
      </div>
      <div>
        <FormLabel>Type</FormLabel>
        <FormSelect value={type} onChange={v => setType(v as AppointmentType)}>
          {APPOINTMENT_TYPES.map(t => <option key={t} value={t}>{appointmentTypeLabel(t)}</option>)}
        </FormSelect>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><FormLabel>Datum</FormLabel><FormInput type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><FormLabel>Tijd</FormLabel><FormInput type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
      </div>
      <div>
        <FormLabel>Locatie</FormLabel>
        <FormInput value={location} onChange={e => setLocation(e.target.value)} placeholder="Bijv. FysioPlus Utrecht" />
      </div>
      <SaveBtn onClick={save} saved={saved}>Opslaan</SaveBtn>
    </DashModalShell>
  );
}

// ─── Quick modal: Training ────────────────────────────────────────────────────

function TrainingQuickModal({ onClose, addDagboekWorkout, trainingSchemas, today }: {
  onClose: () => void;
  addDagboekWorkout: (w: DagboekWorkout) => void;
  trainingSchemas: { id: string; title: string }[];
  today: string;
}) {
  const [title, setTitle]     = useState("");
  const [schemaId, setSchemaId] = useState("");
  const [date, setDate]       = useState(today);
  const [saved, setSaved]     = useState(false);

  function save() {
    if (!title.trim() && !schemaId) return;
    addDagboekWorkout({ id: crypto.randomUUID(), date, title: title.trim(), schemaId: schemaId || undefined, completed: false, createdAt: new Date().toISOString() });
    setSaved(true);
    setTimeout(onClose, 900);
  }

  return (
    <DashModalShell title="Training toevoegen" onClose={onClose}>
      <div>
        <FormLabel>Trainingsschema (optioneel)</FormLabel>
        <FormSelect value={schemaId} onChange={setSchemaId}>
          <option value="">— Geen schema —</option>
          {trainingSchemas.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </FormSelect>
      </div>
      <div>
        <FormLabel>Titel / omschrijving</FormLabel>
        <FormInput value={title} onChange={e => setTitle(e.target.value)} placeholder="Bijv. Looptraining 20 min" />
      </div>
      <div>
        <FormLabel>Datum</FormLabel>
        <FormInput type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>
      <SaveBtn onClick={save} saved={saved}>Opslaan</SaveBtn>
    </DashModalShell>
  );
}

// ─── Quick modal: Medicatie ───────────────────────────────────────────────────

const MED_OPTIES = ["Paracetamol", "Ibuprofen", "Naproxen", "Diclofenac", "Oxycodon", "Tramadol", "Anders"];

function MedicatieQuickModal({ onClose, addMedicatie, today }: {
  onClose: () => void;
  addMedicatie: (m: MedicatieLog) => void;
  today: string;
}) {
  const now = new Date();
  const [naam, setNaam]         = useState("Paracetamol");
  const [naamAnders, setNaamAnders] = useState("");
  const [dosering, setDosering] = useState("500mg");
  const [hoeveelheid, setHoeveelheid] = useState("1");
  const [date, setDate]         = useState(today);
  const [time, setTime]         = useState(`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`);
  const [reden, setReden]       = useState("Pijnbestrijding");
  const [saved, setSaved]       = useState(false);

  function save() {
    const effectiefNaam = naam === "Anders" ? naamAnders.trim() : naam;
    if (!effectiefNaam) return;
    addMedicatie({ id: crypto.randomUUID(), date, time, naam: effectiefNaam, dosering, hoeveelheid, reden });
    setSaved(true);
    setTimeout(onClose, 900);
  }

  return (
    <DashModalShell title="Medicatie loggen" onClose={onClose}>
      <div>
        <FormLabel>Medicatie</FormLabel>
        <FormSelect value={naam} onChange={setNaam}>
          {MED_OPTIES.map(o => <option key={o} value={o}>{o}</option>)}
        </FormSelect>
      </div>
      {naam === "Anders" && (
        <div>
          <FormLabel>Naam medicatie</FormLabel>
          <FormInput value={naamAnders} onChange={e => setNaamAnders(e.target.value)} placeholder="Naam van het medicijn" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div><FormLabel>Dosering</FormLabel><FormInput value={dosering} onChange={e => setDosering(e.target.value)} placeholder="500mg" /></div>
        <div><FormLabel>Hoeveelheid</FormLabel><FormInput value={hoeveelheid} onChange={e => setHoeveelheid(e.target.value)} placeholder="1" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><FormLabel>Datum</FormLabel><FormInput type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><FormLabel>Tijd</FormLabel><FormInput type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
      </div>
      <div>
        <FormLabel>Reden</FormLabel>
        <FormInput value={reden} onChange={e => setReden(e.target.value)} placeholder="Bijv. Pijnbestrijding" />
      </div>
      <SaveBtn onClick={save} saved={saved}>Opslaan</SaveBtn>
    </DashModalShell>
  );
}

// ─── Quick modal: Document ────────────────────────────────────────────────────

const DOC_TYPES: DocumentType[] = ["brief", "verslag", "scan", "recept", "overig"];
const DOC_TYPE_LABELS: Record<DocumentType, string> = { brief: "Brief", verslag: "Verslag", scan: "Scan / afbeelding", recept: "Recept", overig: "Overig" };
const ZORGVERLENER_OPTIES = ["Ziekenhuis", "Fysiotherapeut", "Huisarts", "Anders"];

function DocumentQuickModal({ onClose, addDossierDocument, today }: {
  onClose: () => void;
  addDossierDocument: (d: DossierDocument) => void;
  today: string;
}) {
  const [title, setTitle]       = useState("");
  const [type, setType]         = useState<DocumentType>("brief");
  const [date, setDate]         = useState(today);
  const [zorgverlener, setZorgverlener] = useState("Ziekenhuis");
  const [zorgverlenerAnders, setZorgverlenerAnders] = useState("");

  const [saved, setSaved] = useState(false);

  function save() {
    if (!title.trim()) return;
    addDossierDocument({ id: crypto.randomUUID(), title: title.trim(), type, date, zorgverlener, zorgverlenerAnders: zorgverlener === "Anders" ? zorgverlenerAnders : undefined, omschrijving: "" });
    setSaved(true);
    setTimeout(onClose, 900);
  }

  return (
    <DashModalShell title="Document toevoegen" onClose={onClose}>
      <div>
        <FormLabel>Titel</FormLabel>
        <FormInput value={title} onChange={e => setTitle(e.target.value)} placeholder="Bijv. MRI-verslag knie" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FormLabel>Type</FormLabel>
          <FormSelect value={type} onChange={v => setType(v as DocumentType)}>
            {DOC_TYPES.map(t => <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>)}
          </FormSelect>
        </div>
        <div><FormLabel>Datum</FormLabel><FormInput type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
      </div>
      <div>
        <FormLabel>Zorgverlener</FormLabel>
        <FormSelect value={zorgverlener} onChange={setZorgverlener}>
          {ZORGVERLENER_OPTIES.map(o => <option key={o} value={o}>{o}</option>)}
        </FormSelect>
      </div>
      {zorgverlener === "Anders" && (
        <div>
          <FormLabel>Naam zorgverlener</FormLabel>
          <FormInput value={zorgverlenerAnders} onChange={e => setZorgverlenerAnders(e.target.value)} placeholder="Naam van de zorgverlener" />
        </div>
      )}
      <SaveBtn onClick={save} saved={saved}>Opslaan</SaveBtn>
    </DashModalShell>
  );
}

// ─── Inline SVG line chart ────────────────────────────────────────────────────

function TrendChart({ checkIns }: { checkIns: { date: string; dagscore: number }[] }) {
  const recent = [...checkIns].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  if (recent.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <TrendingUp size={18} className="text-gray-200 mb-2" />
        <p className="text-xs text-gray-400">Vul meer check-ins in om je trend te zien</p>
      </div>
    );
  }
  const VW = 560; const VH = 120;
  const PL = 26; const PR = 12; const PT = 10; const PB = 24;
  const cW = VW - PL - PR; const cH = VH - PT - PB;
  const n  = recent.length;
  const xP = (i: number) => PL + (n === 1 ? cW / 2 : (i / (n - 1)) * cW);
  const yP = (s: number) => PT + cH - ((s - 1) / 4) * cH;
  const pts = recent.map((ci, i) => ({ x: xP(i), y: yP(ci.dagscore), ci }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L ${pts[n-1].x.toFixed(1)} ${(PT+cH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(PT+cH).toFixed(1)} Z`;

  const lblSet = new Set([0, n - 1]);
  if (n >= 7) lblSet.add(Math.floor(n / 2));

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#e8632a" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#e8632a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[1,2,3,4,5].map(s => (
        <line key={s} x1={PL} y1={yP(s)} x2={VW-PR} y2={yP(s)}
          stroke={s===3 ? "#ece9e4" : "#f5f3f0"} strokeWidth="0.75" />
      ))}
      <path d={area} fill="url(#dashGrad)" />
      <path d={line} fill="none" stroke="#e8632a" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      {pts.map((p, i) => {
        const isLast = i === n - 1;
        return (
          <g key={i}>
            {isLast && <circle cx={p.x} cy={p.y} r={7} fill="#e8632a" opacity="0.08" />}
            <circle cx={p.x} cy={p.y} r={isLast ? 3.5 : 2}
              fill={isLast ? "#e8632a" : "#fff"} stroke="#e8632a"
              strokeWidth={isLast ? 0 : 1.5} opacity={isLast ? 1 : 0.7} />
          </g>
        );
      })}
      {pts.map((p, i) => lblSet.has(i) && (
        <text key={i} x={p.x} y={VH - 2} textAnchor="middle" fontSize="9" fill="#b5b0a8">
          {fmtShort(p.ci.date)}
        </text>
      ))}
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();
  const {
    hydrated,
    profile,
    checkIns, addCheckIn, updateCheckIn,
    appointments, addAppointment,
    medicatie, addMedicatie,
    dagboekWorkouts, trainingSchemas, addDagboekWorkout,
    dossierDocumenten, addDossierDocument, fotoUpdates,
    doelen, mijlpalen, contactpersonen,
    dagsSindsBlessure, dagsSindsOperatie, fase,
  } = useAppData();

  const [quickModal, setQuickModal] = useState<QuickModal>(null);

  // Open modal from URL query param (from TopBar notification CTAs or other deeplinks)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("modal") as QuickModal;
    if (m && ["checkin", "afspraak", "training", "medicatie", "document"].includes(m as string)) {
      setQuickModal(m);
      // Clean the URL without triggering navigation
      const url = new URL(window.location.href);
      url.searchParams.delete("modal");
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  if (!hydrated) return null;

  const today      = todayStr();
  const weekDates  = getWeekDates();

  // ── Computed ──────────────────────────────────────────────────────────────

  const todayCheckIn  = checkIns.find(c => c.date === today);
  const weekCheckIns  = checkIns.filter(c => weekDates.includes(c.date));
  const avgScore      = weekCheckIns.length
    ? weekCheckIns.reduce((s, c) => s + c.dagscore, 0) / weekCheckIns.length
    : null;

  const todayApts     = [...appointments].filter(a => a.date === today).sort((a, b) => a.time.localeCompare(b.time));
  const upcomingApts  = [...appointments].filter(a => a.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const todayWorkouts = dagboekWorkouts.filter(w => w.date === today);
  const weekWorkouts  = dagboekWorkouts.filter(w => weekDates.includes(w.date));
  const trainedDays   = new Set(weekWorkouts.filter(w => w.completed).map(w => w.date)).size;

  const medVandaag    = [...medicatie].filter(m => m.date === today).sort((a, b) => a.time.localeCompare(b.time));

  const recentDocs    = [...dossierDocumenten].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const latestFoto    = [...fotoUpdates].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;

  const mainGoal      = doelen.find(d => d.type === "main") ?? null;
  const completedMijl = mijlpalen.filter(m => m.completed).length;
  const nextMijlpaal  = [...mijlpalen].filter(m => !m.completed)
    .sort((a, b) => (a.fase ?? "").localeCompare(b.fase ?? ""))[0] ?? null;

  const tomorrow = (() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const yesterday = (() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  // ── Focus card (slimme prioriteitskaart) ─────────────────────────────────

  let focusCard: FocusCardData | null = null;

  if (todayApts.length > 0) {
    const a = todayApts[0];
    focusCard = {
      kind: "afspraak", color: "#3b82f6", bg: "#eff6ff", icon: Calendar,
      microcopy: "Vandaag staat deze afspraak voor je klaar",
      title: a.title,
      details: [
        { icon: Clock, value: a.time },
        ...(a.location ? [{ icon: MapPin as React.ElementType, value: a.location }] : []),
        ...(a.behandelaar ? [{ value: `Met ${a.behandelaar}` }] : []),
      ],
      cta: "Bekijk in dagboek",
      ctaHref: "/dagboek",
    };
  } else {
    const openWorkout = todayWorkouts.find(w => !w.completed) ?? null;
    if (openWorkout) {
      const schema = trainingSchemas.find(s => s.id === openWorkout.schemaId);
      focusCard = {
        kind: "training", color: "#0ea5e9", bg: "#f0f9ff", icon: Dumbbell,
        microcopy: "Deze training wacht nog op je",
        title: schema ? schema.title : openWorkout.title,
        details: [],
        cta: "Training openen",
        ctaHref: "/dagboek",
      };
    } else if (medVandaag.length > 0) {
      focusCard = {
        kind: "medicatie", color: "#8b5cf6", bg: "#f5f3ff", icon: Pill,
        microcopy: "Je medicatie van vandaag vraagt aandacht",
        title: medVandaag[0].naam,
        details: [{ value: `${medVandaag[0].dosering} · ${medVandaag[0].time}` }],
        cta: "Medicatie loggen",
        ctaModal: "medicatie",
      };
    } else if (!todayCheckIn) {
      focusCard = {
        kind: "checkin", color: "#e8632a", bg: "#fff3ee", icon: ClipboardCheck,
        microcopy: "Je check-in van vandaag staat nog open",
        title: "Dagelijkse check-in",
        details: [],
        cta: "Check-in invullen",
        ctaModal: "checkin",
      };
    } else if (nextMijlpaal) {
      focusCard = {
        kind: "doel", color: "#e8632a", bg: "#fff3ee", icon: Target,
        microcopy: "Dit is je volgende stap in herstel",
        title: nextMijlpaal.title,
        details: nextMijlpaal.fase ? [{ value: nextMijlpaal.fase }] : [],
        cta: "Doelstellingen bekijken",
        ctaHref: "/doelstellingen",
      };
    } else if (mainGoal && !mainGoal.completed) {
      focusCard = {
        kind: "doel", color: "#e8632a", bg: "#fff3ee", icon: Target,
        microcopy: "Dit is je hoofddoel in dit traject",
        title: mainGoal.title,
        details: [],
        cta: "Doelstellingen bekijken",
        ctaHref: "/doelstellingen",
      };
    }
  }

  // ── Recente activiteit ────────────────────────────────────────────────────

  type ActivityItem = { id: string; date: string; sortKey: string; icon: React.ElementType; iconColor: string; iconBg: string; title: string; sub: string; href: string };
  const activity: ActivityItem[] = [];

  checkIns.slice(0, 5).forEach(c => activity.push({
    id: `ci-${c.id}`, date: c.date, sortKey: c.date + "T23:59",
    icon: ClipboardCheck, iconColor: "#e8632a", iconBg: "#fff3ee",
    title: "Check-in", sub: `Dagscore ${c.dagscore}/5 — ${SCORE_LABELS[c.dagscore] ?? ""}`, href: "/check-in",
  }));
  appointments.slice(0, 5).forEach(a => activity.push({
    id: `apt-${a.id}`, date: a.date, sortKey: `${a.date}T${a.time}`,
    icon: Calendar, iconColor: "#3b82f6", iconBg: "#eff6ff",
    title: a.title, sub: `${appointmentTypeLabel(a.type)} · ${fmtShort(a.date)} ${a.time}`, href: "/dagboek",
  }));
  dagboekWorkouts.filter(w => w.completed).slice(0, 5).forEach(w => {
    const schema = trainingSchemas.find(s => s.id === w.schemaId);
    activity.push({
      id: `wk-${w.id}`, date: w.date, sortKey: w.completedAt ?? w.date + "T12:00",
      icon: Dumbbell, iconColor: "#0ea5e9", iconBg: "#f0f9ff",
      title: schema ? schema.title : w.title, sub: `Training afgerond · ${fmtShort(w.date)}`, href: "/training",
    });
  });
  medicatie.slice(0, 4).forEach(m => activity.push({
    id: `med-${m.id}`, date: m.date, sortKey: `${m.date}T${m.time}`,
    icon: Pill, iconColor: "#8b5cf6", iconBg: "#f5f3ff",
    title: m.naam, sub: `${m.dosering} · ${fmtShort(m.date)} ${m.time}`, href: "/medicatie",
  }));
  mijlpalen.filter(m => m.completed && m.completedAt).slice(0, 3).forEach(m => activity.push({
    id: `mij-${m.id}`, date: m.completedAt!, sortKey: m.completedAt! + "T12:00",
    icon: Trophy, iconColor: "#e8632a", iconBg: "#fff3ee",
    title: m.title, sub: `Mijlpaal behaald · ${fmtShort(m.completedAt!)}`, href: "/doelstellingen",
  }));
  dossierDocumenten.slice(0, 3).forEach(d => activity.push({
    id: `doc-${d.id}`, date: d.date, sortKey: d.date + "T12:00",
    icon: FileText, iconColor: "#6b7280", iconBg: "#f9fafb",
    title: d.title, sub: `Document · ${fmtShort(d.date)}`, href: "/dossier",
  }));

  const recentActivity = activity.sort((a, b) => b.sortKey.localeCompare(a.sortKey)).slice(0, 6);

  // ── Tijd & context ────────────────────────────────────────────────────────
  const now  = new Date();
  const hour = now.getHours();
  const voornaam = (profile.naam ?? "").split(" ")[0] ?? "";
  const begroeting = greeting(hour, voornaam);

  const recentScores = [...checkIns]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7)
    .map(c => c.dagscore);
  const trend = computeTrend(recentScores);

  const gisterscheckIn = checkIns.find(c => c.date === yesterday);
  const contextScore = todayCheckIn?.dagscore ?? gisterscheckIn?.dagscore ?? null;
  const trainedToday = todayWorkouts.some(w => w.completed);
  const motivatie = contextMotivatie(contextScore, trend, !!todayCheckIn, trainedToday);

  const isOchtend = hour >= 5  && hour < 12;
  const isMiddag  = hour >= 12 && hour < 18;
  const isAvond   = hour >= 18 && hour < 23;

  const blessureContext = blessureLabel(profile.blessureType, profile.blessureTypeAnders);

  // Foto hint: meer dan 7 dagen geleden
  const fotoOud = latestFoto ? (() => {
    const diff = (now.getTime() - new Date(latestFoto.date + "T12:00:00").getTime()) / 86400000;
    return diff > 7;
  })() : false;

  // Avond check-in reminder
  const toonAvondReminder = isAvond && !todayCheckIn;

  // ── AI Coach insights ─────────────────────────────────────────────────────
  const coachInsights = generateCoachInsights({
    profile,
    checkIns,
    appointments,
    dagboekWorkouts,
    trainingSchemas,
    medicatie,
    mijlpalen,
    doelen,
    fotoUpdates,
    dagsSindsBlessure,
    fase,
    now,
  });

  const MOOD_CONFIG = {
    positief:    { label: "Positief",    color: "#16a34a", bg: "#f0fdf4", dot: "#22c55e" },
    stabiel:     { label: "Stabiel",     color: "#e8632a", bg: "#fff3ee", dot: "#e8632a" },
    voorzichtig: { label: "Voorzichtig", color: "#ca8a04", bg: "#fefce8", dot: "#eab308" },
  } as const;

  const moodCfg = MOOD_CONFIG[coachInsights.moodTag];

  function handleCoachAction(action: string) {
    if (action === "modal:checkin") { setQuickModal("checkin"); return; }
    if (action.startsWith("navigate:")) {
      router.push(action.slice("navigate:".length));
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6 max-w-5xl mx-auto space-y-6 sm:space-y-8">

      {/* ════════════════════════════════════════════════════════════════════
          RIJ 1 — HERO (twee losse kaarten)
      ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Links: licht — begroeting + motivatie + context */}
        <Panel className="lg:col-span-2">
          <div className="p-6">
            {/* Datum */}
            <p className="text-[11px] font-medium uppercase tracking-widest mb-1 text-gray-400">
              {now.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}
            </p>

            {/* Begroeting */}
            <p className="text-xl font-bold text-gray-900 mb-1 leading-tight">{begroeting}</p>

            {/* Context: blessure + fase */}
            <p className="text-xs text-gray-400 mb-4 leading-none">
              Herstel van {blessureContext}
              {" · "}dag {dagsSindsBlessure}
              {isOchtend && " · Goeie dag gewenst"}
              {isMiddag && " · Halverwege de dag"}
              {isAvond && " · Tijd om terug te blikken"}
            </p>

            {/* Motivatie — both desktop and mobile, inline between context and badges */}
            <p className="text-sm leading-relaxed mb-5 max-w-sm"
              style={{ color: "#4a4a52" }}>
              {motivatie}
            </p>

            {/* Fase + trend badge */}
            <div className="flex flex-wrap gap-2 mb-5">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
                style={{ background: "#fff3ee", color: "#e8632a", border: "1px solid rgba(232,99,42,0.2)" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#e8632a" }} />
                {fase}
              </span>
              {trend === "stijgend" && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full"
                  style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
                  ↑ Stijgende trend
                </span>
              )}
              {trend === "dalend" && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full"
                  style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                  ↓ Dalende trend
                </span>
              )}
            </div>

            {/* Dag stats */}
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-2xl font-bold leading-none text-gray-900">{dagsSindsBlessure}</p>
                <p className="text-xs mt-0.5 text-gray-400">dagen herstel</p>
              </div>
              {dagsSindsOperatie > 0 && (
                <div>
                  <p className="text-2xl font-bold leading-none text-gray-900">{dagsSindsOperatie}</p>
                  <p className="text-xs mt-0.5 text-gray-400">na operatie</p>
                </div>
              )}
            </div>
          </div>
        </Panel>

        {/* Rechts: donker vlak met wit binnenkaartje */}
        <div className="rounded-2xl p-4"
          style={{ background: "#18181a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 px-1" style={{ color: "#ffffff" }}>
            Deze week
          </p>
          <div className="rounded-xl p-4" style={{ background: "#ffffff" }}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Gem. check-in score</p>
                {avgScore !== null ? (
                  <p className="text-lg font-bold leading-none" style={{ color: scoreColor(Math.round(avgScore)) }}>
                    {avgScore.toFixed(1)}<span className="text-xs font-normal ml-0.5 text-gray-400">/5</span>
                  </p>
                ) : (
                  <p className="text-lg font-bold leading-none text-gray-300">—</p>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Trainingen afgerond</p>
                <p className="text-lg font-bold leading-none text-gray-900">
                  {trainedDays}<span className="text-xs font-normal ml-0.5 text-gray-400">/7</span>
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Medicijn innames</p>
                <p className="text-lg font-bold leading-none text-gray-900">
                  {medicatie.filter(m => weekDates.includes(m.date)).length}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Mijlpalen behaald</p>
                <p className="text-lg font-bold leading-none text-gray-900">{completedMijl}</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ════════════════════════════════════════════════════════════════════
          RIJ 1.5 — FOCUS VAN VANDAAG
      ════════════════════════════════════════════════════════════════════ */}
      {focusCard && (
        <div>
          <RowLabel>Jouw focus van vandaag</RowLabel>
          <div className="rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4 p-5"
            style={{
              background: "#ffffff",
              border: "1px solid #e8e5df",
              boxShadow: `inset 4px 0 0 0 ${focusCard.color}, 0 1px 4px rgba(0,0,0,0.04)`,
            }}>
            {/* Icoon */}
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: focusCard.bg }}>
              <focusCard.icon size={22} style={{ color: focusCard.color }} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-gray-400 mb-0.5 leading-none">{focusCard.microcopy}</p>
              <p className="text-base font-semibold text-gray-900 leading-snug">{focusCard.title}</p>
              {focusCard.details.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                  {focusCard.details.map((d, i) => (
                    <span key={i} className="flex items-center gap-1 text-xs text-gray-400">
                      {d.icon && <d.icon size={10} />}
                      {d.value}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="shrink-0">
              {focusCard.ctaHref ? (
                <Link href={focusCard.ctaHref}>
                  <div className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: "#1c1c1e" }}>
                    {focusCard.cta}
                  </div>
                </Link>
              ) : (
                <button onClick={() => setQuickModal(focusCard!.ctaModal!)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: "#1c1c1e" }}>
                  {focusCard.cta}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Avond check-in reminder — alleen tonen als avond + check-in nog open */}
      {toonAvondReminder && (
        <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl"
          style={{ background: "#fff3ee", border: "1px solid rgba(232,99,42,0.2)" }}>
          <div className="flex items-center gap-3">
            <ClipboardCheck size={16} style={{ color: "#e8632a" }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "#1a1a1a" }}>Je check-in van vandaag staat nog open</p>
              <p className="text-xs text-gray-400 mt-0.5">Hoe kijk je terug op vandaag?</p>
            </div>
          </div>
          <button onClick={() => setQuickModal("checkin")}
            className="shrink-0 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "#e8632a" }}>
            Nu invullen
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MOBILE AI COACH — boven Vandaag, alleen op mobiel
      ════════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden rounded-2xl overflow-hidden"
        style={{ background: moodCfg.bg, border: `1px solid ${moodCfg.color}28` }}>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: moodCfg.dot }} />
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: moodCfg.color }}>
                {moodCfg.label}
              </span>
            </div>
            <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "#c4bfb7" }}>
              Coach
            </span>
          </div>
          <p className="text-sm leading-relaxed mb-3" style={{ color: "#374151" }}>
            {coachInsights.dailyInsight}
          </p>
          <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
            style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,0,0,0.06)" }}>
            <p className="text-xs leading-snug flex-1 text-gray-700">{coachInsights.nextStep}</p>
            <button
              onClick={() => handleCoachAction(coachInsights.nextStepAction)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white touch-press"
              style={{ background: "#1c1c1e" }}
            >
              Doen
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          RIJ 2 — VANDAAG
      ════════════════════════════════════════════════════════════════════ */}
      <div>
        <RowLabel>Vandaag</RowLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          {/* 2.1 Check-in */}
          <Panel>
            <div className="p-4 flex flex-col h-full">
              <div className="mb-2.5">
                {todayCheckIn
                  ? <StatusPill label="Afgerond" color="#16a34a" bg="#f0fdf4" />
                  : <StatusPill label="Open" color="#e8632a" bg="#fff3ee" />}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#fff3ee" }}>
                  <ClipboardCheck size={13} style={{ color: "#e8632a" }} />
                </div>
                <span className="text-xs font-semibold text-gray-500">Check-in</span>
              </div>
              {todayCheckIn ? (
                <>
                  <div className="flex items-end gap-1.5 mb-1">
                    <span className="text-3xl font-bold leading-none" style={{ color: scoreColor(todayCheckIn.dagscore) }}>
                      {todayCheckIn.dagscore}
                    </span>
                    <span className="text-xs text-gray-400 mb-0.5">/5</span>
                  </div>
                  <p className="text-xs font-medium mb-2" style={{ color: scoreColor(todayCheckIn.dagscore) }}>
                    {SCORE_LABELS[todayCheckIn.dagscore]}
                  </p>
                  {todayCheckIn.notitie && (
                    <p className="text-[11px] text-gray-400 leading-relaxed italic line-clamp-2 flex-1">
                      &ldquo;{todayCheckIn.notitie}&rdquo;
                    </p>
                  )}
                  <Link href="/check-in" className="mt-auto pt-3 block">
                    <span className="text-xs font-medium" style={{ color: "#e8632a" }}>Bewerken →</span>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-400 flex-1">Nog niet ingevuld vandaag</p>
                  <button onClick={() => setQuickModal("checkin")} className="mt-3 w-full">
                    <div className="w-full text-center text-xs font-semibold py-2 rounded-xl"
                      style={{ background: "#1c1c1e", color: "#ffffff" }}>
                      Invullen
                    </div>
                  </button>
                </>
              )}
            </div>
          </Panel>

          {/* 2.2 Afspraken */}
          <Panel>
            <div className="p-4 flex flex-col h-full">
              <div className="mb-2.5">
                {(() => {
                  const show = todayApts[0] ?? upcomingApts[0] ?? null;
                  if (!show) return null;
                  if (show.date === today) return <StatusPill label="Vandaag" color="#3b82f6" bg="#eff6ff" />;
                  if (show.date === tomorrow) return <StatusPill label="Morgen" color="#6b7280" bg="#f3f4f6" />;
                  return <StatusPill label="Eerstvolgend" color="#6b7280" bg="#f3f4f6" />;
                })()}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#eff6ff" }}>
                  <Calendar size={13} style={{ color: "#3b82f6" }} />
                </div>
                <span className="text-xs font-semibold text-gray-500">Afspraken</span>
              </div>
              {(() => {
                const show = todayApts[0] ?? upcomingApts[0] ?? null;
                if (!show) return <p className="text-sm text-gray-400 flex-1">Geen afspraken</p>;
                const isToday = show.date === today;
                return (
                  <>
                    <p className="text-sm font-semibold text-gray-900 leading-snug mb-1">{show.title}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">
                      <Clock size={10} /> {show.time}
                    </p>
                    {show.location && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <MapPin size={10} /> <span className="truncate">{show.location}</span>
                      </p>
                    )}
                    {!isToday && (
                      <p className="text-[10px] mt-1.5" style={{ color: "#b5b0a8" }}>{fmtShort(show.date)}</p>
                    )}
                    <Link href="/dagboek" className="mt-auto pt-3 block">
                      <span className="text-xs font-medium" style={{ color: "#3b82f6" }}>Dagboek →</span>
                    </Link>
                  </>
                );
              })()}
            </div>
          </Panel>

          {/* 2.3 Training */}
          <Panel>
            <div className="p-4 flex flex-col h-full">
              <div className="mb-2.5">
                {todayWorkouts.length > 0 && (() => {
                  const allDone = todayWorkouts.every(w => w.completed);
                  return allDone
                    ? <StatusPill label="Afgerond" color="#16a34a" bg="#f0fdf4" />
                    : <StatusPill label="Open" color="#0ea5e9" bg="#f0f9ff" />;
                })()}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#f0f9ff" }}>
                  <Dumbbell size={13} style={{ color: "#0ea5e9" }} />
                </div>
                <span className="text-xs font-semibold text-gray-500">Training</span>
              </div>
              {todayWorkouts.length > 0 ? (
                <>
                  {todayWorkouts.slice(0, 2).map((w) => {
                    const schema = trainingSchemas.find(s => s.id === w.schemaId);
                    return (
                      <div key={w.id} className="flex items-center gap-2 mb-1.5">
                        <div className="w-3 h-3 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: w.completed ? "#22c55e" : "#e8e5df" }}>
                          {w.completed && <Check size={7} className="text-white" strokeWidth={3} />}
                        </div>
                        <p className="text-xs font-medium text-gray-800 truncate leading-snug">
                          {schema ? schema.title : w.title}
                        </p>
                      </div>
                    );
                  })}
                  {todayWorkouts.length > 2 && (
                    <p className="text-[10px] text-gray-400 mb-1">+{todayWorkouts.length - 2} meer</p>
                  )}
                  <Link href="/training" className="mt-auto pt-3 block">
                    <span className="text-xs font-medium" style={{ color: "#0ea5e9" }}>Training →</span>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-400 flex-1">Geen training vandaag</p>
                  <Link href="/dagboek?modal=training" className="mt-3 block">
                    <span className="text-xs font-medium" style={{ color: "#0ea5e9" }}>Inplannen →</span>
                  </Link>
                </>
              )}
            </div>
          </Panel>

          {/* 2.4 Medicatie */}
          <Panel>
            <div className="p-4 flex flex-col h-full">
              <div className="mb-2.5">
                {medVandaag.length > 0 && (
                  <StatusPill label={`${medVandaag.length}× gelogd`} color="#8b5cf6" bg="#f5f3ff" />
                )}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#f5f3ff" }}>
                  <Pill size={13} style={{ color: "#8b5cf6" }} />
                </div>
                <span className="text-xs font-semibold text-gray-500">Medicatie</span>
              </div>
              {medVandaag.length > 0 ? (
                <>
                  {medVandaag.slice(0, 2).map((m) => (
                    <div key={m.id} className="mb-1.5">
                      <p className="text-xs font-semibold text-gray-800 leading-tight">{m.naam}</p>
                      <p className="text-[10px] text-gray-400">{m.dosering} · {m.time}</p>
                    </div>
                  ))}
                  {medVandaag.length > 2 && (
                    <p className="text-[10px] text-gray-400 mb-1">+{medVandaag.length - 2} meer</p>
                  )}
                  <Link href="/medicatie" className="mt-auto pt-2 block">
                    <span className="text-xs font-medium" style={{ color: "#8b5cf6" }}>Alles →</span>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-400 flex-1">Geen medicatie gelogd</p>
                  <button onClick={() => setQuickModal("medicatie")} className="mt-3 block text-left">
                    <span className="text-xs font-medium" style={{ color: "#8b5cf6" }}>Loggen →</span>
                  </button>
                </>
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          RIJ 3 — AI COACH (desktop only — mobiel toont compact blok bovenaan)
      ════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block">
        <RowLabel>Jouw coach</RowLabel>
        <Panel>
          <div className="p-5">

            {/* Header: mood tag + label */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: moodCfg.dot }} />
                <span className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: moodCfg.color }}>
                  {moodCfg.label}
                </span>
              </div>
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">AI Coach</span>
            </div>

            {/* Daily insight */}
            <p className="text-sm leading-relaxed text-gray-800 mb-5">
              {coachInsights.dailyInsight}
            </p>

            {/* Next step */}
            <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 mb-5"
              style={{ background: "#f8f7f4", border: "1px solid #e8e5df" }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <Target size={14} style={{ color: "#e8632a" }} className="shrink-0" />
                <p className="text-xs font-medium text-gray-700 leading-snug truncate">
                  {coachInsights.nextStep}
                </p>
              </div>
              <button
                onClick={() => handleCoachAction(coachInsights.nextStepAction)}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "#1c1c1e" }}>
                Doen
              </button>
            </div>

            {/* Weekly summary */}
            <div className="rounded-xl px-4 py-3 mb-4"
              style={{ background: moodCfg.bg, border: `1px solid ${moodCfg.color}22` }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5"
                style={{ color: moodCfg.color }}>
                Samenvatting deze week
              </p>
              <div className="grid grid-cols-4 gap-3 mb-3">
                <div>
                  <p className="text-base font-bold leading-none text-gray-900">
                    {coachInsights.weekly.avgScore !== null ? coachInsights.weekly.avgScore.toFixed(1) : "—"}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">gem. score</p>
                </div>
                <div>
                  <p className="text-base font-bold leading-none text-gray-900">{coachInsights.weekly.trainedDays}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">trainingen</p>
                </div>
                <div>
                  <p className="text-base font-bold leading-none text-gray-900">{coachInsights.weekly.medCount}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">medicatie</p>
                </div>
                <div>
                  <p className="text-base font-bold leading-none text-gray-900">{coachInsights.weekly.completedMijl}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">mijlpalen</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{coachInsights.weekly.coachTekst}</p>
            </div>

            {/* Disclaimer */}
            <p className="text-[10px] leading-relaxed" style={{ color: "#c4bfb7" }}>
              {coachInsights.disclaimerTekst}
            </p>
          </div>
        </Panel>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          RIJ 4 — VOORTGANG
      ════════════════════════════════════════════════════════════════════ */}
      <div>
        <RowLabel>Voortgang</RowLabel>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Hersteltrend — 2/3 */}
          <Panel className="lg:col-span-2">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Hersteltrend</h3>
                <p className="text-xs text-gray-400 mt-0.5">Dagscore — laatste 14 check-ins</p>
              </div>
              {avgScore !== null && (
                <div className="text-right">
                  <p className="text-xl font-bold leading-none" style={{ color: "#e8632a" }}>{avgScore.toFixed(1)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">gemiddeld</p>
                </div>
              )}
            </div>
            <div className="px-5 pb-4">
              <TrendChart checkIns={checkIns} />
            </div>
          </Panel>

          {/* Doelstellingen — 1/3 */}
          <Panel>
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Doelstellingen</h3>
                <Link href="/doelstellingen" className="text-xs font-medium" style={{ color: "#e8632a" }}>
                  Bekijken
                </Link>
              </div>

              {mainGoal && (
                <div className="rounded-xl p-3 mb-4"
                  style={{ background: mainGoal.completed ? "#f0fdf4" : "#f8f7f4", border: `1px solid ${mainGoal.completed ? "#bbf7d0" : "#e8e5df"}` }}>
                  <div className="flex items-start gap-2">
                    <span className="text-base">{mainGoal.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Hoofddoel</p>
                      <p className="text-xs font-semibold text-gray-800 leading-snug">{mainGoal.title}</p>
                    </div>
                    {mainGoal.completed && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "#22c55e" }}>
                        <Check size={10} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mb-2">
                <Trophy size={12} style={{ color: "#e8632a" }} />
                <span className="text-xs text-gray-500">
                  <span className="font-semibold text-gray-800">{completedMijl}</span>
                  {" / "}
                  <span className="font-semibold text-gray-800">{mijlpalen.length}</span>
                  {" mijlpalen"}
                </span>
              </div>

              {mijlpalen.length > 0 && (
                <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ background: "#f0ede8" }}>
                  <div className="h-full rounded-full"
                    style={{ width: `${(completedMijl / mijlpalen.length) * 100}%`, background: "#e8632a" }} />
                </div>
              )}

              {nextMijlpaal && (
                <div className="flex items-start gap-2">
                  <Target size={11} className="mt-0.5 shrink-0" style={{ color: "#e8632a" }} />
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 mb-0.5">Volgende</p>
                    <p className="text-xs font-medium text-gray-700 leading-snug">{nextMijlpaal.title}</p>
                    {nextMijlpaal.fase && <p className="text-[10px] text-gray-400 mt-0.5">{nextMijlpaal.fase}</p>}
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          RIJ 4 — RECENT & PLANNING
      ════════════════════════════════════════════════════════════════════ */}
      <div>
        <RowLabel>Recent &amp; planning</RowLabel>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Recente activiteit — 2/3 */}
          <Panel className="lg:col-span-2">
            <PanelHeader title="Recente activiteit" />
            {recentActivity.length === 0 ? (
              <EmptyHint>Nog geen activiteit geregistreerd.</EmptyHint>
            ) : (
              <div>
                {recentActivity.map((item, i) => {
                  const dateLabel = item.date === today ? "Vandaag" : item.date === yesterday ? "Gisteren" : fmtShort(item.date);
                  return (
                    <Link href={item.href} key={item.id}>
                      <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                        style={{ borderTop: i > 0 ? "1px solid #f5f3f0" : undefined }}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: item.iconBg }}>
                          <item.icon size={13} style={{ color: item.iconColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate leading-snug">{item.title}</p>
                          <p className="text-xs text-gray-400 truncate">{item.sub}</p>
                        </div>
                        <span className="text-[10px] font-medium shrink-0 ml-2"
                          style={{ color: item.date === today ? "#e8632a" : "#b5b0a8" }}>
                          {dateLabel}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* Komende afspraken — 1/3 */}
          <Panel>
            <PanelHeader title="Komende afspraken" cta="Alles" href="/dagboek" />
            {upcomingApts.length === 0 ? (
              <EmptyHint>Geen afspraken gepland.</EmptyHint>
            ) : (
              <div>
                {upcomingApts.slice(0, 4).map((apt, i) => {
                  const isToday = apt.date === today;
                  const isTomorrow = apt.date === tomorrow;
                  return (
                    <div key={apt.id} style={{ borderTop: i > 0 ? "1px solid #f5f3f0" : undefined }}>
                      <div className="flex items-start gap-3 px-4 py-3">
                        <div className="w-9 h-9 rounded-xl flex flex-col items-center justify-center shrink-0"
                          style={{ background: isToday ? "#fff3ee" : "#f3f0eb" }}>
                          <span className="text-xs font-bold leading-none"
                            style={{ color: isToday ? "#e8632a" : "#374151" }}>
                            {new Date(apt.date + "T12:00:00").getDate()}
                          </span>
                          <span className="text-[9px] uppercase"
                            style={{ color: isToday ? "#e8632a" : "#9ca3af" }}>
                            {new Date(apt.date + "T12:00:00").toLocaleString("nl-NL", { month: "short" })}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-xs font-semibold text-gray-900 truncate">{apt.title}</p>
                          </div>
                          <p className="text-[11px] text-gray-400 flex items-center gap-1">
                            <Clock size={9} /> {apt.time}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant={APT_BADGE[apt.type]}>{appointmentTypeLabel(apt.type)}</Badge>
                            {isToday && <StatusPill label="Vandaag" color="#e8632a" bg="#fff3ee" />}
                            {isTomorrow && <StatusPill label="Morgen" color="#6b7280" bg="#f3f4f6" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          RIJ 5 — DOSSIER & FOTO
      ════════════════════════════════════════════════════════════════════ */}
      {(recentDocs.length > 0 || latestFoto) && (
        <div>
          <RowLabel>Dossier</RowLabel>
          <div className={`grid grid-cols-1 ${latestFoto ? "lg:grid-cols-2" : ""} gap-4`}>

            {/* Recente documenten — alleen als er docs zijn */}
            {recentDocs.length > 0 && (
              <Panel>
                <div className="flex items-center justify-between px-5 pt-5 pb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Recente documenten</h3>
                  <Link href="/dossier?tab=documenten" className="text-xs font-medium flex items-center gap-1" style={{ color: "#e8632a" }}>
                    Alles <ArrowRight size={11} />
                  </Link>
                </div>
                <div>
                  {recentDocs.map((doc, i) => (
                    <Link href="/dossier?tab=documenten" key={doc.id}>
                      <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                        style={{ borderTop: i > 0 ? "1px solid #f5f3f0" : undefined }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: "#fff3ee" }}>
                          <FileText size={13} style={{ color: "#e8632a" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                          <p className="text-xs text-gray-400">
                            {doc.zorgverlener === "Anders" ? doc.zorgverlenerAnders : doc.zorgverlener}
                            {" · "}{fmtShort(doc.date)}
                          </p>
                        </div>
                        <ChevronRight size={12} className="text-gray-300 shrink-0" />
                      </div>
                    </Link>
                  ))}
                  <div className="px-5 py-3" style={{ borderTop: "1px solid #f5f3f0" }}>
                    <button onClick={() => setQuickModal("document")}
                      className="text-xs font-medium flex items-center gap-1"
                      style={{ color: "#e8632a" }}>
                      <Plus size={11} /> Document toevoegen
                    </button>
                  </div>
                </div>
              </Panel>
            )}

            {/* Laatste foto update — alleen als aanwezig */}
            {latestFoto && (
              <Panel>
                <div className="flex items-center justify-between px-5 pt-5 pb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Laatste foto update</h3>
                  <div className="flex items-center gap-2">
                    <StatusPill label={fmtShort(latestFoto.date)} color="#6b7280" bg="#f3f4f6" />
                    <Link href="/dossier?tab=foto-updates" className="text-xs font-medium flex items-center gap-1" style={{ color: "#e8632a" }}>
                      Dossier <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
                <div className="flex items-start gap-4 px-5 pb-5">
                  <div className="w-20 h-20 rounded-xl shrink-0 overflow-hidden flex items-center justify-center"
                    style={{ background: "#f3f0eb" }}>
                    {latestFoto.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={latestFoto.imageUrl} alt="Laatste foto update"
                        className="w-full h-full object-cover" />
                    ) : (
                      <Image size={22} className="text-gray-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 mb-1">{fmtLong(latestFoto.date)}</p>
                    {latestFoto.notitie ? (
                      <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 italic">
                        &ldquo;{latestFoto.notitie}&rdquo;
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400">Geen notitie</p>
                    )}
                    {fotoOud && (
                      <button onClick={() => {}} className="mt-2 text-xs font-medium flex items-center gap-1"
                        style={{ color: "#e8632a" }}>
                        <Plus size={10} /> Nieuwe foto update toevoegen?
                      </button>
                    )}
                  </div>
                </div>
              </Panel>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          RIJ 6 — SNELLE ACTIES
      ════════════════════════════════════════════════════════════════════ */}
      <div>
        <RowLabel>Snelle acties</RowLabel>

        {/* Mobile: 4 items without Document */}
        <div className="grid grid-cols-2 gap-3 sm:hidden">
          {(([
            { label: "Check-in",  icon: ClipboardCheck, modal: "checkin"  , color: "#e8632a", bg: "#fff3ee" },
            { label: "Afspraak",  icon: Calendar,       modal: "afspraak" , color: "#3b82f6", bg: "#eff6ff" },
            { label: "Training",  icon: Dumbbell,       modal: "training" , color: "#0ea5e9", bg: "#f0f9ff" },
            { label: "Medicatie", icon: Pill,           modal: "medicatie", color: "#8b5cf6", bg: "#f5f3ff" },
          ]) as { label: string; icon: React.ElementType; modal: NonNullable<QuickModal>; color: string; bg: string }[]).map((a) => (
            <button key={a.modal} onClick={() => setQuickModal(a.modal)}
              className="rounded-2xl border p-4 flex flex-col items-center gap-2.5 text-center transition-all cursor-pointer w-full"
              style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: a.bg }}>
                <a.icon size={16} style={{ color: a.color }} />
              </div>
              <div className="flex items-center gap-1">
                <Plus size={10} style={{ color: a.color }} />
                <span className="text-xs font-semibold text-gray-700">{a.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Desktop: all 5 items including Document */}
        <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(([
            { label: "Check-in",  icon: ClipboardCheck, modal: "checkin"  , color: "#e8632a", bg: "#fff3ee" },
            { label: "Afspraak",  icon: Calendar,       modal: "afspraak" , color: "#3b82f6", bg: "#eff6ff" },
            { label: "Training",  icon: Dumbbell,       modal: "training" , color: "#0ea5e9", bg: "#f0f9ff" },
            { label: "Medicatie", icon: Pill,           modal: "medicatie", color: "#8b5cf6", bg: "#f5f3ff" },
            { label: "Document",  icon: FileText,       modal: "document" , color: "#10b981", bg: "#f0fdf4" },
          ]) as { label: string; icon: React.ElementType; modal: NonNullable<QuickModal>; color: string; bg: string }[]).map((a) => (
            <button key={a.modal} onClick={() => setQuickModal(a.modal)}
              className="rounded-2xl border p-4 flex flex-col items-center gap-2.5 text-center transition-all hover:shadow-sm hover:-translate-y-px cursor-pointer w-full"
              style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: a.bg }}>
                <a.icon size={16} style={{ color: a.color }} />
              </div>
              <div className="flex items-center gap-1">
                <Plus size={10} style={{ color: a.color }} />
                <span className="text-xs font-semibold text-gray-700">{a.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SNELLE ACTIE MODALS
      ════════════════════════════════════════════════════════════════════ */}
      {quickModal === "checkin" && (
        <CheckInModal
          existing={checkIns.find(c => c.date === today)}
          initialDate={today}
          onClose={() => setQuickModal(null)}
          onSave={(ci: CheckIn) => {
            const existing = checkIns.find(c => c.date === today);
            if (existing) updateCheckIn(ci.id, ci);
            else addCheckIn(ci);
          }}
        />
      )}
      {quickModal === "afspraak" && (
        <AppointmentModal
          initialDate={today}
          contactpersonen={contactpersonen}
          onClose={() => setQuickModal(null)}
          onSave={(apt: Appointment) => {
            addAppointment(apt);
            setQuickModal(null);
          }}
        />
      )}
      {quickModal === "training" && (
        <TrainingModal
          trainingSchemas={trainingSchemas.filter(s => s.status === "actief").map(s => ({ id: s.id, title: s.title }))}
          onClose={() => setQuickModal(null)}
          onSave={(w: DagboekWorkout) => {
            addDagboekWorkout(w);
            setQuickModal(null);
          }}
        />
      )}
      {quickModal === "medicatie" && (
        <InnameModal
          onClose={() => setQuickModal(null)}
          title="Medicatie loggen"
          saveLabel="Opslaan"
          onSave={(data: InnameFormFields) => {
            const effectiefNaam = data.naam === "Anders" && data.naamAnders.trim()
              ? data.naamAnders.trim()
              : data.naam;
            addMedicatie({
              id: crypto.randomUUID(),
              date: data.datum,
              time: data.tijdstip,
              naam: effectiefNaam,
              dosering: data.dosering.trim(),
              hoeveelheid: data.hoeveelheid.trim() || "—",
              reden: data.reden.trim(),
              notitie: data.notitie.trim() || undefined,
            });
            setQuickModal(null);
          }}
        />
      )}
      {quickModal === "document" && (
        <DocumentQuickModal
          onClose={() => setQuickModal(null)}
          addDossierDocument={addDossierDocument}
          today={today}
        />
      )}

    </div>
  );
}
