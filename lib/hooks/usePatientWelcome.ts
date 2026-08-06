"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { loadOwnPatientWelcomeState, markOwnPatientWelcomed } from "@/lib/services/patientProtocolService";

/**
 * Eenmalig "Welkom [Naam]"-moment op het patiëntendashboard na afronding
 * van de intake (zie components/dashboard/WelcomeHero.tsx). Bewust los van
 * AppDataProvider/useAppData gehouden, zelfde reden als usePatientCareContext:
 * dit is geen patiëntdata uit de centrale store, maar een eigen server-
 * vlag (patients.welcomed_at, migratie 089/090).
 */
export function usePatientWelcome() {
  const { user, loading: authLoading } = useAuth();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [welcomedAt, setWelcomedAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    loadOwnPatientWelcomeState(user.id).then((state) => {
      if (cancelled) return;
      setPatientId(state?.patientId ?? null);
      setWelcomedAt(state?.welcomedAt ?? null);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const markWelcomed = useCallback(() => {
    if (!patientId) return;
    markOwnPatientWelcomed(patientId);
  }, [patientId]);

  return { patientId, welcomedAt, loaded, markWelcomed };
}
