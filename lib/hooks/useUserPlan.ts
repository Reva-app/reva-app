"use client";

import { useMemo } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAppData } from "@/lib/store";
import { getUserPlan, type PlanInfo } from "@/lib/subscription";

export interface UserPlanResult extends PlanInfo {
  /** True zodra het profiel geladen is uit Supabase. Toon geen plan-UI daarvoor. */
  hydrated: boolean;
}

/**
 * Returns the active PlanInfo for the currently logged-in user.
 * Reads from the central store (profile) + auth (email for dev bypass).
 */
export function useUserPlan(): UserPlanResult {
  const { user } = useAuth();
  const { profile, hydrated } = useAppData();

  const planInfo = useMemo(
    () => getUserPlan(profile, user?.email),
    [profile, user?.email]
  );

  return useMemo(
    () => ({ ...planInfo, hydrated }),
    [planInfo, hydrated]
  );
}
