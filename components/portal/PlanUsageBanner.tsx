"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { loadPortalPlanUsage } from "@/lib/services/portalService";
import { PATIENT_WARNING_RATIO } from "@/lib/plans";

/**
 * Zachte patiëntlimiet (migratie 130): melding voor de Practice Owner vanaf
 * 90% van het aantal actieve patiënten in het pakket. Blokkeert nooit iets.
 */
export function PlanUsageBanner() {
  const { membership } = usePortalMembership();
  const [activePatients, setActivePatients] = useState<number | null>(null);
  const isOwner = membership?.roleKey === "organization_owner";
  const organizationId = membership?.organizationId;
  const maxPatients = membership?.maxPatients ?? null;

  useEffect(() => {
    if (!isOwner || !organizationId || maxPatients === null) return;
    let cancelled = false;
    loadPortalPlanUsage(organizationId).then((u) => { if (!cancelled && u) setActivePatients(u.activePatients); });
    return () => { cancelled = true; };
  }, [isOwner, organizationId, maxPatients]);

  if (!isOwner || maxPatients === null || activePatients === null) return null;
  if (activePatients < maxPatients * PATIENT_WARNING_RATIO) return null;

  const over = activePatients > maxPatients;
  return (
    <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 text-xs" style={{ background: "#fff7ed", color: "#9a3412", borderBottom: "1px solid #fed7aa" }}>
      <Users size={14} className="shrink-0" />
      <span>
        {over
          ? `Je hebt ${activePatients} actieve patiënten, meer dan de ${maxPatients} van je pakket. Je kunt gewoon doorwerken.`
          : `Je hebt ${activePatients} van de ${maxPatients} actieve patiënten in je pakket.`}{" "}
        <Link href="/portal/abonnement" className="font-semibold underline underline-offset-2">Bekijk je abonnement</Link>
      </span>
    </div>
  );
}
