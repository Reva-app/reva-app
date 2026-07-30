"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { loadPatientCareContext, type PatientCareContext } from "@/lib/services/careContextService";

/**
 * Organisatie-, locatie- en behandelaarnaam van de ingelogde patiënt.
 * Bewust los van AppDataProvider/useAppData en van usePatientProtocol
 * gehouden, zelfde reden als useAppBranding los van de patiëntenstore
 * staat: dit is geen patiëntdata en geen protocoldata, maar
 * weergave-informatie over de praktijk. Voor patiënten zonder organisatie/
 * locatie/behandelaar komt gewoon `null`/lege velden terug.
 */
export function usePatientCareContext(): PatientCareContext | null {
  const { user, loading: authLoading } = useAuth();
  const [context, setContext] = useState<PatientCareContext | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    loadPatientCareContext().then((data) => {
      if (!cancelled) setContext(data);
    });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  return context;
}
