"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { loadCurrentMembership, type PortalMembership } from "@/lib/services/portalService";

export interface PortalMembershipResult {
  /** True zodra de check is uitgevoerd (los van het resultaat). */
  checked: boolean;
  membership: PortalMembership | null;
}

/**
 * Checkt of de huidige ingelogde gebruiker een actief lidmaatschap heeft (voor
 * de Practice Portal). Losstaand van useAppData/AppDataProvider, net als
 * usePlatformAdmin — de Practice Portal mount die patiënt-specifieke store
 * bewust niet.
 */
export function usePortalMembership(): PortalMembershipResult {
  const { user, loading: authLoading } = useAuth();
  const [membership, setMembership] = useState<PortalMembership | null>(null);
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;
    loadCurrentMembership(user.id).then((result) => {
      if (cancelled) return;
      setMembership(result);
      setCheckedUserId(user.id);
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  if (authLoading) return { checked: false, membership: null };
  if (!user) return { checked: true, membership: null };
  return {
    checked: checkedUserId === user.id,
    membership: checkedUserId === user.id ? membership : null,
  };
}
