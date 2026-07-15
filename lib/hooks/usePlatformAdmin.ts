"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { checkIsPlatformAdmin } from "@/lib/services/adminService";

export interface PlatformAdminResult {
  /** True zodra de check is uitgevoerd (los van het resultaat). */
  checked: boolean;
  isAdmin: boolean;
}

/**
 * Checkt of de huidige ingelogde gebruiker platform admin is (voor het Super
 * Admin Portal). Losstaand van useAppData/AppDataProvider — het admin-portaal
 * mount die patiënt-specifieke store bewust niet.
 */
export function usePlatformAdmin(): PlatformAdminResult {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  // Onthoudt voor welke user het resultaat geldt, zodat "checked" puur
  // afgeleid kan worden i.p.v. via een aparte state die in de effect-body
  // synchroon gezet moet worden voor de "geen user"-tak.
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;
    checkIsPlatformAdmin(user.id).then((result) => {
      if (cancelled) return;
      setIsAdmin(result);
      setCheckedUserId(user.id);
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  if (authLoading) return { checked: false, isAdmin: false };
  if (!user) return { checked: true, isAdmin: false };
  return { checked: checkedUserId === user.id, isAdmin: checkedUserId === user.id && isAdmin };
}
