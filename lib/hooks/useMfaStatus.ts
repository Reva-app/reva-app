"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabaseClient";

export interface MfaStatusResult {
  /** True zodra de check is uitgevoerd (los van het resultaat). */
  checked: boolean;
  /** True zodra de huidige sessie aal2 heeft bereikt. */
  satisfied: boolean;
  /** True als er nog helemaal geen geverifieerde factor bestaat. */
  needsEnrollment: boolean;
  /** Id van de geverifieerde totp-factor, nodig voor de challenge-stap. */
  factorId: string | null;
  refresh: () => void;
}

interface MfaState {
  satisfied: boolean;
  needsEnrollment: boolean;
  factorId: string | null;
}

/**
 * Checkt of de huidige ingelogde gebruiker tweestapsverificatie heeft
 * afgerond voor déze sessie — los van usePortalMembership, zelfde patroon
 * (checked afgeleid van checkedUserId === user.id, niet een losse boolean,
 * om verouderde state bij een gebruikerswissel te voorkomen).
 */
export function useMfaStatus(): MfaStatusResult {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<MfaState | null>(null);
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const [aalRes, factorsRes] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ]);
      if (cancelled) return;

      if (aalRes.error || !aalRes.data) {
        // Onbekende status: bij twijfel dicht, nooit open.
        setState({ satisfied: false, needsEnrollment: true, factorId: null });
        setCheckedUserId(user.id);
        return;
      }

      const verifiedTotp = factorsRes.data?.totp.find((f) => f.status === "verified") ?? null;
      setState({
        satisfied: aalRes.data.currentLevel === "aal2",
        needsEnrollment: aalRes.data.nextLevel === "aal1",
        factorId: verifiedTotp?.id ?? null,
      });
      setCheckedUserId(user.id);
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, nonce]);

  function refresh() {
    setNonce((n) => n + 1);
  }

  if (authLoading || !user) {
    return { checked: false, satisfied: false, needsEnrollment: false, factorId: null, refresh };
  }
  const isCurrent = checkedUserId === user.id;
  return {
    checked: isCurrent,
    satisfied: isCurrent ? !!state?.satisfied : false,
    needsEnrollment: isCurrent ? !!state?.needsEnrollment : false,
    factorId: isCurrent ? (state?.factorId ?? null) : null,
    refresh,
  };
}
