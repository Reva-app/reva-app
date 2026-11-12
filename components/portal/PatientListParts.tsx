"use client";

import { Badge } from "@/components/ui/Badge";
import type { ListColumn } from "@/components/ui/ResponsiveList";
import { formatDate } from "@/lib/data";
import {
  isPatientInactive, ATTENTION_REASON_LABELS, ATTENTION_BADGE_VARIANT, PATIENT_INACTIVITY_THRESHOLD_DAYS,
  type PortalPatient,
} from "@/lib/services/portalService";

/**
 * Bouwstenen van de patiëntenlijst in het praktijkportaal: kolommen voor de
 * tabel (vanaf md) en de kaart voor telefoon. Los van de pagina zodat de
 * weergave op zichzelf te bekijken en te hergebruiken is.
 */

export type PatientSortKey = "name" | "therapist" | "protocol" | "location" | "lastCheckin" | "status";

function initials(name: string | null, email: string | null) {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function PatientAvatar({ patient, size = 36 }: { patient: PortalPatient; size?: number }) {
  return <InitialsAvatar name={patient.fullName} email={patient.email} muted={patient.status !== "active"} size={size} />;
}

export function InitialsAvatar({ name, email = null, muted = false, size = 36 }: { name: string | null; email?: string | null; muted?: boolean; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
      style={{
        width: size, height: size,
        background: muted ? "#efece6" : "var(--brand-accent, #e8632a)",
        color: muted ? "#8a847b" : "#ffffff",
      }}
    >
      {initials(name, email)}
    </div>
  );
}

function daysSince(date: string): number {
  const d = new Date(date + (date.length === 10 ? "T00:00:00" : ""));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - d.getTime()) / 86_400_000);
}

/** "Vandaag", "Gisteren", "5 dagen geleden" of een datum (vanaf 2 weken). */
export function relativeCheckin(date: string | null): string {
  if (!date) return "Nog geen check-in";
  const days = daysSince(date);
  if (days <= 0) return "Vandaag";
  if (days === 1) return "Gisteren";
  if (days < 14) return `${days} dagen geleden`;
  return formatDate(date);
}

/** Groen: deze week; oranje: binnen de inactiviteitsgrens; grijs: langer of nooit. */
function checkinDotColor(date: string | null): string {
  if (!date) return "#d1cdc6";
  const days = daysSince(date);
  if (days <= 7) return "#16a34a";
  if (days <= PATIENT_INACTIVITY_THRESHOLD_DAYS) return "#d97706";
  return "#d1cdc6";
}

export function CheckinIndicator({ date }: { date: string | null }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span aria-hidden className="w-2 h-2 rounded-full shrink-0" style={{ background: checkinDotColor(date) }} />
      <span className={date ? "text-gray-700" : "text-gray-400"}>{relativeCheckin(date)}</span>
    </span>
  );
}

export function patientNeedsAttention(p: PortalPatient): boolean {
  return p.status === "active" && (
    p.intakeStatus === "submitted" || p.checkinSignals.length > 0 || isPatientInactive(p.lastCheckinDate, p.createdAt)
  );
}

/** Klinische signalen + weinig activiteit, alleen bij actieve dossiers. */
function AttentionBadges({ patient: p }: { patient: PortalPatient }) {
  if (p.status !== "active") return null;
  // Wie nog op de eigen intake wacht, is niet "inactief" — dat is verwacht.
  const inactive = p.intakeStatus !== "requested" && isPatientInactive(p.lastCheckinDate, p.createdAt);
  return (
    <>
      {p.intakeStatus === "submitted" && <Badge variant="accent">Intake ingevuld · kies herstelplan</Badge>}
      {p.intakeStatus === "requested" && <Badge variant="muted">Wacht op intake</Badge>}
      {p.checkinSignals.map((reason) => (
        <Badge key={reason} variant={ATTENTION_BADGE_VARIANT[reason]}>{ATTENTION_REASON_LABELS[reason]}</Badge>
      ))}
      {inactive && <Badge variant="warning">{p.lastCheckinDate ? "Weinig activiteit" : "Nog geen activiteit"}</Badge>}
    </>
  );
}

export function statusBadge(status: string) {
  if (status === "active") return <Badge variant="success">Actief</Badge>;
  if (status === "inactive") return <Badge variant="muted">Inactief</Badge>;
  if (status === "archived") return <Badge variant="muted">Gearchiveerd</Badge>;
  return <Badge variant="muted">{status}</Badge>;
}

function accountLabel(p: PortalPatient): string | null {
  if (p.hasAccount) return null;
  if (p.invitedAt) return `Uitgenodigd ${formatDate(p.invitedAt)}`;
  return "Nog geen account";
}

function planLabel(p: PortalPatient): string {
  if (p.intakeStatus === "requested" && !p.protocolName) return "Vult de intake zelf in";
  return p.protocolName || p.injuryType || "Nog geen herstelplan";
}

export const PATIENT_COLUMNS: ListColumn<PortalPatient, PatientSortKey>[] = [
  {
    key: "name", header: "Patiënt", sortKey: "name",
    cell: (p) => (
      <div className="flex items-center gap-3 min-w-[220px]">
        <PatientAvatar patient={p} />
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate">{p.fullName || "Nog niet ingevuld"}</p>
          <p className={`text-xs truncate mt-0.5 ${p.protocolName || p.injuryType ? "text-gray-500" : "text-gray-400"}`}>{planLabel(p)}</p>
        </div>
      </div>
    ),
  },
  { key: "therapist", header: "Behandelaar", sortKey: "therapist", hideBelow: "lg", className: "text-gray-600 whitespace-nowrap", cell: (p) => p.therapistName || "—" },
  { key: "lastCheckin", header: "Laatste check-in", sortKey: "lastCheckin", cell: (p) => <CheckinIndicator date={p.lastCheckinDate} /> },
  {
    key: "attention", header: "Aandacht",
    cell: (p) => (
      <div className="flex items-center gap-1.5 flex-wrap">
        {patientNeedsAttention(p) || p.intakeStatus ? <AttentionBadges patient={p} /> : <span className="text-gray-300">—</span>}
      </div>
    ),
  },
  { key: "location", header: "Locatie", sortKey: "location", hideBelow: "xl", className: "text-gray-600 whitespace-nowrap", cell: (p) => p.locationName || "—" },
  {
    key: "status", header: "Status", sortKey: "status",
    cell: (p) => {
      const account = accountLabel(p);
      return (
        <div className="flex flex-col items-start gap-1">
          {statusBadge(p.status)}
          {account && <span className="text-[11px] text-gray-400 whitespace-nowrap">{account}</span>}
        </div>
      );
    },
  },
];

/** Kaart voor telefoon: wie, welk traject, hoe gaat het. */
export function PatientCard({ patient: p }: { patient: PortalPatient }) {
  const account = accountLabel(p);
  return (
    <div className="flex items-start gap-3">
      <PatientAvatar patient={p} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900 leading-snug truncate">{p.fullName || "Nog niet ingevuld"}</p>
          {p.status !== "active" && statusBadge(p.status)}
        </div>
        <p className={`text-sm leading-snug mt-0.5 truncate ${p.protocolName || p.injuryType ? "text-gray-600" : "text-gray-400"}`}>{planLabel(p)}</p>
        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs mt-2">
          <CheckinIndicator date={p.lastCheckinDate} />
          {p.therapistName && <span className="text-gray-500">{p.therapistName}</span>}
        </div>
        {(patientNeedsAttention(p) || p.intakeStatus || account) && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            <AttentionBadges patient={p} />
            {account && <Badge variant="muted">{account}</Badge>}
          </div>
        )}
      </div>
    </div>
  );
}
