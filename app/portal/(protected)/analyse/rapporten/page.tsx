"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Pin, ArrowLeft } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { VIEW_ANALYTICS_ROLES } from "@/lib/services/portalService";
import { REPORTS, REPORT_CATEGORY_LABELS, type ReportCategory } from "@/lib/reports/reports";

const PIN_KEY = "reva-pinned-reports";
function readPins(): string[] { try { return JSON.parse(localStorage.getItem(PIN_KEY) ?? "[]"); } catch { return []; } }

/** Alle rapporten, doorzoekbaar en per categorie, met vastpinnen. */
export default function PortalReportsPage() {
  const { membership } = usePortalMembership();
  const isOwner = !!membership && VIEW_ANALYTICS_ROLES.includes(membership.roleKey);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<ReportCategory | "">("");
  const [pins, setPins] = useState<string[]>(() => (typeof window === "undefined" ? [] : readPins()));
  const qs = typeof window === "undefined" ? "" : window.location.search;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return REPORTS
      .filter((r) => (isOwner || !r.ownerOnly) && (!cat || r.category === cat) && (!q || `${r.name} ${r.description}`.toLowerCase().includes(q)))
      .sort((a, b) => Number(pins.includes(b.id)) - Number(pins.includes(a.id)));
  }, [query, cat, pins, isOwner]);

  function togglePin(id: string) {
    const next = pins.includes(id) ? pins.filter((p) => p !== id) : [...pins, id];
    setPins(next);
    try { localStorage.setItem(PIN_KEY, JSON.stringify(next)); } catch { /* geen opslag */ }
  }

  const chip = (active: boolean) => active
    ? { background: "var(--brand-accent, #e8632a)", borderColor: "var(--brand-accent, #e8632a)", color: "#fff" }
    : { background: "#fff", borderColor: "#e8e5df", color: "#4b5563" };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <Link href={`/portal/analyse${qs}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"><ArrowLeft size={14} /> Analyse</Link>
      <SectionHeader title="Rapporten" subtitle={isOwner ? "Verdiep je in herstel, betrokkenheid, je praktijk en je team" : "Verdiep je in het herstel van jouw patiënten"} />

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rapporten zoeken" className="w-full rounded-xl border bg-white pl-10 pr-4 py-2.5 text-sm" style={{ borderColor: "#e8e5df" }} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setCat("")} className="rounded-full px-3 py-1.5 text-xs font-medium border" style={chip(cat === "")}>Alle</button>
        {(Object.keys(REPORT_CATEGORY_LABELS) as ReportCategory[]).filter((c) => isOwner || c !== "team").map((c) => (
          <button key={c} type="button" onClick={() => setCat(c)} className="rounded-full px-3 py-1.5 text-xs font-medium border" style={chip(cat === c)}>{REPORT_CATEGORY_LABELS[c]}</button>
        ))}
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: "#e8e5df" }}>
        <div className="hidden sm:grid grid-cols-[1fr_160px_44px] gap-3 px-4 py-2.5 text-xs font-medium text-gray-500 border-b" style={{ background: "#faf9f7", borderColor: "#f0ede8" }}>
          <span>Naam</span><span>Categorie</span><span />
        </div>
        {list.length === 0 ? (
          <p className="text-sm text-gray-500 p-6">Geen rapport gevonden.</p>
        ) : list.map((r) => (
          <div key={r.id} className="grid grid-cols-[1fr_44px] sm:grid-cols-[1fr_160px_44px] gap-3 items-center px-4 border-b last:border-b-0 hover:bg-[#faf9f7]" style={{ borderColor: "#f0ede8" }}>
            <Link href={`/portal/analyse/rapporten/${r.id}${qs}`} className="py-3 min-w-0">
              <span className="block text-sm font-medium text-gray-900">{r.name}</span>
              <span className="block text-xs text-gray-500 truncate">{r.description}</span>
            </Link>
            <span className="hidden sm:block text-sm text-gray-600">{REPORT_CATEGORY_LABELS[r.category]}</span>
            <button type="button" onClick={() => togglePin(r.id)} aria-label={pins.includes(r.id) ? "Losmaken" : "Vastpinnen"} title={pins.includes(r.id) ? "Losmaken" : "Bovenaan vastpinnen"}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100">
              <Pin size={15} style={pins.includes(r.id) ? { color: "var(--brand-accent, #e8632a)", fill: "var(--brand-accent, #e8632a)" } : { color: "#c4c0b8" }} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
