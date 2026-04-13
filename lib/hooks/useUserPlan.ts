"use client";

import { useMemo } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAppData } from "@/lib/store";
import { getUserPlan, type PlanInfo } from "@/lib/subscription";

/**
 * Returns the active PlanInfo for the currently logged-in user.
 * Reads from the central store (profile) + auth (email for dev bypass).
 */
export function useUserPlan(): PlanInfo {
  const { user } = useAuth();
  const { profile } = useAppData();

  return useMemo(
    () => getUserPlan(profile, user?.email),
    [profile, user?.email]
  );
}
