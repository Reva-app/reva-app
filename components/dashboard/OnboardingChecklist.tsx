"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardCheck, Target, Dumbbell, Pill, Calendar, Camera, Check, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
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

function dismissKey(userId: string) {
  return `reva_checklist_dismissed_${userId}`;
}

export function OnboardingChecklist({
  hasActiveProtocol, protocol, checkIns, doelen, dagboekWorkouts, appointments, medicatie, fotoUpdates,
}: OnboardingChecklistProps) {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== "undefined" && user ? localStorage.getItem(dismissKey(user.id)) === "1" : false
  );

  function handleDismiss() {
    if (!user) return;
    localStorage.setItem(dismissKey(user.id), "1");
    setDismissed(true);
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

  if (dismissed || allRequiredDone) return null;

  return (
    <Card className="relative">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Verbergen"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-gray-50"
            style={{ borderColor: "#e8e5df" }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: item.done ? "#f0fdf4" : "#f8f7f4" }}
            >
              {item.done ? <Check size={15} style={{ color: "#16a34a" }} /> : <item.icon size={15} className="text-gray-400" />}
            </div>
            <span className={item.done ? "text-sm text-gray-400 line-through" : "text-sm text-gray-700 font-medium"}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
