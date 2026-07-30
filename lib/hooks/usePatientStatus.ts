"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabaseClient";

export type PatientStatus = "active" | "inactive" | "archived";

export interface PatientStatusResult {
  /** True zodra de check is uitgevoerd (los van het resultaat). */
  checked: boolean;
  /** Null zolang er nog geen (of geen gekoppeld) patiëntrecord is gevonden. */
  status: PatientStatus | null;
}

/**
 * Leest patients.status voor de ingelogde patiënt — puur voor de
 * AuthGate-blokkade bij een gearchiveerd/gepauzeerd dossier. Losstaand van
 * usePatientCareContext() gehouden: dat haalt organisatie-/behandelaardata
 * op via een security-definer RPC, dit is een simpele select op het eigen
 * record (al toegestaan via de select-only policy, migratie 070).
 */
export function usePatientStatus(): PatientStatusResult {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<PatientStatus | null>(null);
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("patients")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setStatus((data?.status as PatientStatus | undefined) ?? null);
        setCheckedUserId(user.id);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  if (authLoading) return { checked: false, status: null };
  if (!user) return { checked: true, status: null };

  const checked = checkedUserId === user.id;
  return { checked, status: checked ? status : null };
}
