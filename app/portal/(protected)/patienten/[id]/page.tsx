"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/data";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { loadPortalPatients, type PortalPatient } from "@/lib/services/portalService";

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

export default function PortalPatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const { checked, membership } = usePortalMembership();
  const [patient, setPatient] = useState<PortalPatient | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!checked || !membership) return;
    let cancelled = false;
    loadPortalPatients(membership.organizationId).then((data) => {
      if (cancelled) return;
      const found = data.find((p) => p.id === patientId) ?? null;
      setPatient(found);
      setNotFound(!found);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [checked, membership, patientId]);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
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
          </div>

          <Card>
            <CardHeader title="Behandelgegevens" subtitle="Basisgegevens en behandeltraject" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><span className="text-gray-500">Telefoonnummer:</span> <span className="text-gray-800">{patient.phone || "—"}</span></div>
              <div><span className="text-gray-500">Geboortedatum:</span> <span className="text-gray-800">{patient.dateOfBirth ? formatDate(patient.dateOfBirth) : "—"}</span></div>
              <div><span className="text-gray-500">Geslacht:</span> <span className="text-gray-800">{genderLabel(patient.gender)}</span></div>
              <div><span className="text-gray-500">Vestiging:</span> <span className="text-gray-800">{patient.locationName || "—"}</span></div>
              <div><span className="text-gray-500">Behandelend therapeut:</span> <span className="text-gray-800">{patient.therapistName || "—"}</span></div>
              <div><span className="text-gray-500">Protocol:</span> <span className="text-gray-800">{patient.protocolName || "—"}</span></div>
              <div><span className="text-gray-500">Startdatum behandeling:</span> <span className="text-gray-800">{patient.treatmentStartDate ? formatDate(patient.treatmentStartDate) : "—"}</span></div>
              <div><span className="text-gray-500">Operatiedatum:</span> <span className="text-gray-800">{patient.surgeryDate ? formatDate(patient.surgeryDate) : "—"}</span></div>
              <div><span className="text-gray-500">Laatste check-in:</span> <span className="text-gray-800">{patient.lastCheckinDate ? formatDate(patient.lastCheckinDate) : "—"}</span></div>
            </div>
          </Card>

          <p className="text-xs text-gray-400">
            Volledige voortgang (check-ins, tijdlijn, afspraken) volgt hier in een latere uitbreiding.
          </p>
        </>
      )}
    </div>
  );
}
