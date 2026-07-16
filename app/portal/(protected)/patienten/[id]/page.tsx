"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Camera, Pill, CalendarClock, Dumbbell, Award, Droplets, Pencil } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { PatientEditForm } from "@/components/portal/PatientEditForm";
import { formatDate, formatDateShort } from "@/lib/data";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import {
  loadPortalPatients,
  loadPortalPatientExtras,
  loadPortalLocations,
  loadPortalMembers,
  loadPortalProtocols,
  MANAGE_PATIENTS_ROLES,
  type PortalPatient,
  type PortalPatientExtras,
  type PortalCheckinTrendPoint,
  type PortalLocationOption,
  type PortalMember,
  type PortalProtocolOption,
} from "@/lib/services/portalService";
import { resolveSignedUrl } from "@/lib/services/storageService";

function statusBadge(status: string) {
  if (status === "active") return <Badge variant="success">Actief</Badge>;
  if (status === "inactive") return <Badge variant="muted">Inactief</Badge>;
  if (status === "archived") return <Badge variant="muted">Gearchiveerd</Badge>;
  return <Badge variant="muted">{status}</Badge>;
}

function genderLabel(gender: string | null) {
  if (gender === "man") return "Man";
  if (gender === "vrouw") return "Vrouw";
  if (gender === "anders") return "Anders";
  return "—";
}

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  ziekenhuis: "Ziekenhuis consult",
  fysio: "Fysiotherapie",
  mri: "MRI / Scan",
  operatie: "Operatie",
  nacontrole: "Nacontrole",
  "second-opinion": "Second opinion",
  telefonisch: "Telefonisch consult",
};

function appointmentTypeLabel(type: string | null): string | null {
  if (!type) return null;
  return APPOINTMENT_TYPE_LABELS[type] ?? type;
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr + "T12:00:00").getTime()) / 86_400_000);
}

// ─── Check-in trend (compact lijngrafiek van de dagscore) ──────────────────

function CheckinTrendChart({ points }: { points: PortalCheckinTrendPoint[] }) {
  if (points.length < 2) return null;
  const W = 480;
  const H = 64;
  const padX = 4;
  const padY = 6;
  const max = 5;
  const xStep = (W - padX * 2) / (points.length - 1);
  const pts = points.map((p, i) => ({
    x: padX + i * xStep,
    y: padY + (1 - Math.min(p.dayScore, max) / max) * (H - padY * 2),
  }));
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `M${pts[0].x},${H} ` + pts.map((p) => `L${p.x},${p.y}`).join(" ") + ` L${pts[pts.length - 1].x},${H} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        <defs>
          <linearGradient id="checkin-trend-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8632a" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#e8632a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={padX} y1={padY + f * (H - padY * 2)} x2={W - padX} y2={padY + f * (H - padY * 2)} stroke="#f0ede8" strokeWidth="1" />
        ))}
        <path d={area} fill="url(#checkin-trend-grad)" />
        <polyline points={polyline} fill="none" stroke="#e8632a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill="#e8632a" />
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-gray-400">{formatDateShort(points[0].date)}</span>
        <span className="text-[10px] text-gray-400">{formatDateShort(points[points.length - 1].date)}</span>
      </div>
    </div>
  );
}

export default function PortalPatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const { checked, membership } = usePortalMembership();
  const [patient, setPatient] = useState<PortalPatient | null>(null);
  const [extras, setExtras] = useState<PortalPatientExtras | null>(null);
  const [locations, setLocations] = useState<PortalLocationOption[]>([]);
  const [members, setMembers] = useState<PortalMember[]>([]);
  const [protocols, setProtocols] = useState<PortalProtocolOption[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);

  const canManagePatients = !!membership && MANAGE_PATIENTS_ROLES.includes(membership.roleKey);

  function refresh(organizationId: string) {
    Promise.all([
      loadPortalPatients(organizationId),
      loadPortalPatientExtras(patientId),
    ]).then(([patients, extrasData]) => {
      const found = patients.find((p) => p.id === patientId) ?? null;
      setPatient(found);
      setNotFound(!found);
      setExtras(extrasData);
      setLoading(false);
    });
  }

  useEffect(() => {
    if (!checked || !membership) return;
    let cancelled = false;
    const organizationId = membership.organizationId;
    Promise.all([
      loadPortalPatients(organizationId),
      loadPortalPatientExtras(patientId),
      loadPortalLocations(organizationId),
      loadPortalMembers(organizationId),
      loadPortalProtocols(organizationId),
    ]).then(([patients, extrasData, locationsData, membersData, protocolsData]) => {
      if (cancelled) return;
      const found = patients.find((p) => p.id === patientId) ?? null;
      setPatient(found);
      setNotFound(!found);
      setExtras(extrasData);
      setLocations(locationsData);
      setMembers(membersData);
      setProtocols(protocolsData);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [checked, membership, patientId]);

  useEffect(() => {
    const path = extras?.latestPhoto?.imagePath;
    let cancelled = false;
    (path ? resolveSignedUrl("dossier-photos", path) : Promise.resolve(null)).then((url) => {
      if (!cancelled) setPhotoUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [extras?.latestPhoto?.imagePath]);

  const lastCheckin = extras?.checkinTrend[extras.checkinTrend.length - 1] ?? null;
  const showMilestone = extras?.recentMilestone && daysSince(extras.recentMilestone.completedAt) <= 30;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => router.push("/portal/patienten")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} /> Terug naar patiënten
      </button>

      {loading ? (
        <p className="text-sm text-gray-400">Laden…</p>
      ) : notFound || !patient ? (
        <p className="text-sm text-gray-400">Dit patiëntdossier is niet gevonden.</p>
      ) : (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <SectionHeader title={patient.fullName || "Naam nog niet ingevuld"} subtitle={patient.email ?? undefined} />
            {statusBadge(patient.status)}
            {showMilestone && (
              <Badge variant="accent" className="flex items-center gap-1">
                <Award size={12} /> Mijlpaal: {extras!.recentMilestone!.title}
              </Badge>
            )}
          </div>

          {/* Check-in status — hoe voelt de patiënt zich */}
          <Card>
            <CardHeader
              title="Check-in status"
              subtitle={lastCheckin ? `Laatste check-in op ${formatDate(lastCheckin.date)}` : undefined}
              action={lastCheckin?.swelling ? <Badge variant="warning" className="flex items-center gap-1"><Droplets size={12} /> Zwelling gemeld</Badge> : undefined}
            />
            {!lastCheckin ? (
              <p className="text-sm text-gray-400">Nog geen check-ins ingevuld.</p>
            ) : (
              <div className="space-y-5">
                <CheckinTrendChart points={extras!.checkinTrend} />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                  <ScoreBar label="Dagscore" value={lastCheckin.dayScore} max={5} />
                  {lastCheckin.painScore !== null && <ScoreBar label="Pijn" value={lastCheckin.painScore} max={10} />}
                  {lastCheckin.mobilityScore !== null && <ScoreBar label="Mobiliteit" value={lastCheckin.mobilityScore} max={5} />}
                  {lastCheckin.energyScore !== null && <ScoreBar label="Energie" value={lastCheckin.energyScore} max={5} />}
                  {lastCheckin.moodScore !== null && <ScoreBar label="Stemming" value={lastCheckin.moodScore} max={5} />}
                  {lastCheckin.sleepScore !== null && <ScoreBar label="Slaap" value={lastCheckin.sleepScore} max={5} />}
                </div>
                {lastCheckin.note && <p className="text-sm text-gray-600 italic">&ldquo;{lastCheckin.note}&rdquo;</p>}
              </div>
            )}
          </Card>

          {/* Vier kaarten: foto, medicatie, afspraak, training */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader title="Laatste foto-update" />
              {!extras?.latestPhoto ? (
                <p className="text-sm text-gray-400">Nog geen foto-update.</p>
              ) : (
                <div className="space-y-2">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt="Laatste voortgangsfoto" className="w-full h-32 object-cover rounded-xl" />
                  ) : (
                    <div className="w-full h-32 rounded-xl flex items-center justify-center" style={{ background: "#f3f0eb" }}>
                      <Camera size={20} style={{ color: "#c4bfb9" }} />
                    </div>
                  )}
                  <p className="text-xs text-gray-500">{formatDate(extras.latestPhoto.date)}</p>
                </div>
              )}
            </Card>

            <Card>
              <CardHeader title="Laatste medicatie" />
              {!extras?.latestMedication ? (
                <p className="text-sm text-gray-400">Nog geen medicatie gelogd.</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5"><Pill size={14} style={{ color: "#e8632a" }} /> {extras.latestMedication.medicationName}</p>
                  {extras.latestMedication.dosage && <p className="text-xs text-gray-500">{extras.latestMedication.dosage}{extras.latestMedication.quantity ? ` · ${extras.latestMedication.quantity}` : ""}</p>}
                  <p className="text-xs text-gray-400">{formatDate(extras.latestMedication.date)}{extras.latestMedication.time ? ` om ${extras.latestMedication.time}` : ""}</p>
                  {extras.latestMedication.reason && <p className="text-xs text-gray-500">Reden: {extras.latestMedication.reason}</p>}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader title="Eerstvolgende afspraak" />
              {!extras?.upcomingAppointment ? (
                <p className="text-sm text-gray-400">Geen geplande afspraak.</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5"><CalendarClock size={14} style={{ color: "#e8632a" }} /> {extras.upcomingAppointment.title}</p>
                  {appointmentTypeLabel(extras.upcomingAppointment.appointmentType) && (
                    <p className="text-xs text-gray-500">{appointmentTypeLabel(extras.upcomingAppointment.appointmentType)}</p>
                  )}
                  <p className="text-xs text-gray-400">{formatDate(extras.upcomingAppointment.date)}{extras.upcomingAppointment.time ? ` om ${extras.upcomingAppointment.time}` : ""}</p>
                  {extras.upcomingAppointment.location && <p className="text-xs text-gray-500">{extras.upcomingAppointment.location}</p>}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader title="Training deze week" />
              {!extras || extras.trainingWeek.total === 0 ? (
                <p className="text-sm text-gray-400">Nog geen trainingen gelogd.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <Dumbbell size={14} style={{ color: "#e8632a" }} />
                    {extras.trainingWeek.completed} van {extras.trainingWeek.total} voltooid
                  </div>
                  <ScoreBar label="Voortgang" value={extras.trainingWeek.completed} max={extras.trainingWeek.total} />
                </div>
              )}
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Behandelgegevens"
              subtitle="Basisgegevens en behandeltraject"
              action={canManagePatients ? (
                <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                  <Pencil size={13} /> Wijzigen
                </Button>
              ) : undefined}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><span className="text-gray-500">Telefoonnummer:</span> <span className="text-gray-800">{patient.phone || "—"}</span></div>
              <div><span className="text-gray-500">Geboortedatum:</span> <span className="text-gray-800">{patient.dateOfBirth ? formatDate(patient.dateOfBirth) : "—"}</span></div>
              <div><span className="text-gray-500">Geslacht:</span> <span className="text-gray-800">{genderLabel(patient.gender)}</span></div>
              <div><span className="text-gray-500">Vestiging:</span> <span className="text-gray-800">{patient.locationName || "—"}</span></div>
              <div><span className="text-gray-500">Behandelend therapeut:</span> <span className="text-gray-800">{patient.therapistName || "—"}</span></div>
              <div><span className="text-gray-500">Protocol:</span> <span className="text-gray-800">{patient.protocolName || "—"}</span></div>
              <div><span className="text-gray-500">Startdatum behandeling:</span> <span className="text-gray-800">{patient.treatmentStartDate ? formatDate(patient.treatmentStartDate) : "—"}</span></div>
              <div><span className="text-gray-500">Operatiedatum:</span> <span className="text-gray-800">{patient.surgeryDate ? formatDate(patient.surgeryDate) : "—"}</span></div>
            </div>
          </Card>

          <p className="text-xs text-gray-400">
            Volledige voortgang (tijdlijn, alle check-ins, documenten) volgt hier in een latere uitbreiding.
          </p>

          {editing && membership && (
            <Modal onClose={() => setEditing(false)} maxWidth="max-w-2xl">
              <PatientEditForm
                patient={patient}
                locations={locations}
                members={members}
                protocols={protocols}
                onSaved={() => { setEditing(false); refresh(membership.organizationId); }}
                onClose={() => setEditing(false)}
              />
            </Modal>
          )}
        </>
      )}
    </div>
  );
}
