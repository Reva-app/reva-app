"use client";

import { useState } from "react";
import { ClipboardCheck, Target, Dumbbell, Pill, Calendar, Camera, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { OnboardingItemGrid } from "@/components/ui/OnboardingItemGrid";
import { OnboardingProgressPill } from "@/components/ui/OnboardingProgressPill";
import { useAuth } from "@/components/auth/AuthProvider";
import type {
  CheckIn, Doel, DagboekWorkout, Appointment, MedicatieLog, FotoUpdate,
} from "@/lib/data";
import type { PatientActiveProtocol } from "@/lib/services/patientProtocolService";

interface OnboardingChecklistProps {
  hasActiveProtocol: boolean;
  protocol: PatientActiveProtocol | null;
  checkIns: CheckIn[];
  doelen: Doel[];
  dagboekWorkouts: DagboekWorkout[];
  appointments: Appointment[];
  medicatie: MedicatieLog[];
  fotoUpdates: FotoUpdate[];
}

function collapseKey(userId: string) {
  return `reva_checklist_dismissed_${userId}`;
}

export function OnboardingChecklist({
  hasActiveProtocol, protocol, checkIns, doelen, dagboekWorkouts, appointments, medicatie, fotoUpdates,
}: OnboardingChecklistProps) {
  const { user } = useAuth();
  // Heeft de gebruiker de kaart ooit al ingeklapt? Zo ja, start ingeklapt
  // (als pill) i.p.v. de volledige kaart opnieuw te forceren bij elk bezoek.
  const [hasCollapsedBefore, setHasCollapsedBefore] = useState(() =>
    typeof window !== "undefined" && user ? localStorage.getItem(collapseKey(user.id)) === "1" : false
  );
  // Sessie-only: klik op de pill klapt 'm deze sessie weer open, zonder de
  // "al eens ingeklapt"-vlag te wissen — bij een volgend bezoek start hij
  // weer ingeklapt, bewust laag-nagging.
  const [sessionExpanded, setSessionExpanded] = useState(false);

  function handleCollapse() {
    if (!user) return;
    localStorage.setItem(collapseKey(user.id), "1");
    setHasCollapsedBefore(true);
    setSessionExpanded(false);
  }

  const trainingDone = hasActiveProtocol
    ? (protocol?.currentPhase?.schedules.some((s) => s.completedThisWeek > 0) ?? false)
    : dagboekWorkouts.some((w) => w.completed);

  const items = [
    { label: "Doe je eerste check-in", icon: ClipboardCheck, done: checkIns.length > 0, href: "/check-in", optional: false },
    { label: "Bekijk je doelen", icon: Target, done: hasActiveProtocol || doelen.length > 0, href: "/doelstellingen", optional: false },
    { label: "Rond je eerste training af", icon: Dumbbell, done: trainingDone, href: "/training", optional: false },
    { label: "Log je medicatie · niet verplicht", icon: Pill, done: medicatie.length > 0, href: "/medicatie", optional: true },
    { label: "Voeg je eerste afspraak toe", icon: Calendar, done: appointments.length > 0, href: "/dagboek", optional: false },
    { label: "Upload je eerste voortgangsfoto", icon: Camera, done: fotoUpdates.length > 0, href: "/dossier?tab=foto-updates", optional: false },
  ];

  const required = items.filter((i) => !i.optional);
  const requiredDone = required.filter((i) => i.done).length;
  const allRequiredDone = requiredDone === required.length;

  if (allRequiredDone) return null;

  if (hasCollapsedBefore && !sessionExpanded) {
    return (
      <OnboardingProgressPill
        label="Aan de slag met REVA"
        doneCount={requiredDone}
        totalCount={required.length}
        onClick={() => setSessionExpanded(true)}
      />
    );
  }

  return (
    <Card className="relative">
      <button
        type="button"
        onClick={handleCollapse}
        aria-label="Inklappen"
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X size={16} />
      </button>

      <div className="mb-4 pr-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Aan de slag met REVA</h2>
        <p className="text-sm text-gray-500">
          Zet deze eerste stappen om optimaal gebruik te maken van je herstelomgeving.
        </p>
        <p className="text-xs font-medium mt-2" style={{ color: "#c4bfb7" }}>
          {requiredDone} van {required.length} stappen voltooid
        </p>
      </div>

      <OnboardingItemGrid items={items} columns={2} />
    </Card>
  );
}
