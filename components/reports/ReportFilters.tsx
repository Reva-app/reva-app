"use client";

import { useEffect, useState } from "react";
import { CalendarDays, User } from "lucide-react";
import { loadPortalMembers, type PortalMember } from "@/lib/services/portalService";
import { REPORT_PERIODS, type ReportPeriod } from "@/lib/services/reportService";

const selectClass = "appearance-none rounded-xl border bg-white pl-9 pr-8 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 cursor-pointer";

/** Periode en (voor de eigenaar) behandelaar, als compacte knoppen bovenaan. */
export function ReportFilters({ organizationId, isOwner, period, onPeriod, therapistId, onTherapist }: {
  organizationId: string;
  isOwner: boolean;
  period: ReportPeriod;
  onPeriod: (p: ReportPeriod) => void;
  therapistId: string | null;
  onTherapist: (id: string | null) => void;
}) {
  const [members, setMembers] = useState<PortalMember[]>([]);
  useEffect(() => {
    if (!isOwner) return;
    let cancelled = false;
    loadPortalMembers(organizationId).then((m) => { if (!cancelled) setMembers(m.filter((x) => x.membershipStatus === "active" && ["therapist", "organization_owner"].includes(x.roleKey))); });
    return () => { cancelled = true; };
  }, [organizationId, isOwner]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative">
        <CalendarDays size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <select aria-label="Periode" value={period} onChange={(e) => onPeriod(Number(e.target.value) as ReportPeriod)} className={selectClass} style={{ borderColor: "#e8e5df" }}>
          {REPORT_PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </label>
      {isOwner ? (
        <label className="relative">
          <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <select aria-label="Behandelaar" value={therapistId ?? ""} onChange={(e) => onTherapist(e.target.value || null)} className={selectClass} style={{ borderColor: "#e8e5df" }}>
            <option value="">Hele praktijk</option>
            {members.map((m) => <option key={m.userId} value={m.userId}>{m.fullName ?? m.email}</option>)}
          </select>
        </label>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-xl border bg-white px-3 py-2 text-sm text-gray-600" style={{ borderColor: "#e8e5df" }}>
          <User size={14} /> Mijn patiënten
        </span>
      )}
    </div>
  );
}
