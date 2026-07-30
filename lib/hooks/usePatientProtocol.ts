"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { loadOwnPatientId, loadMyActiveProtocol, type PatientActiveProtocol } from "@/lib/services/patientProtocolService";

export interface PatientProtocolResult {
  /** True zodra de check is uitgevoerd (los van het resultaat). */
  checked: boolean;
  patientId: string | null;
  protocol: PatientActiveProtocol | null;
  hasActiveProtocol: boolean;
  refresh: () => void;
}

/**
 * Checkt of de ingelogde patiënt een actief, door de fysio toegewezen
 * protocol heeft. Zolang dat niet zo is, blijven Training/Doelstellingen
 * exact hun huidige zelfinvoergedrag houden (zie AGENTS.md-onafhankelijke
 * bouwvolgorde-afspraak: niets verandert voor patiënten zonder protocol).
 */
export function usePatientProtocol(): PatientProtocolResult {
  const { user, loading: authLoading } = useAuth();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<PatientActiveProtocol | null>(null);
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;
    (async () => {
      const id = await loadOwnPatientId(user.id);
      if (cancelled) return;
      setPatientId(id);
      const activeProtocol = id ? await loadMyActiveProtocol(id) : null;
      if (cancelled) return;
      setProtocol(activeProtocol);
      setCheckedUserId(user.id);
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, reloadToken]);

  const refresh = useCallback(() => setReloadToken((t) => t + 1), []);

  if (authLoading) return { checked: false, patientId: null, protocol: null, hasActiveProtocol: false, refresh };
  if (!user) return { checked: true, patientId: null, protocol: null, hasActiveProtocol: false, refresh };

  const checked = checkedUserId === user.id;
  return {
    checked,
    patientId: checked ? patientId : null,
    protocol: checked ? protocol : null,
    hasActiveProtocol: checked && !!protocol,
    refresh,
  };
}
