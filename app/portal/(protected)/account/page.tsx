"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { useAuth } from "@/components/auth/AuthProvider";
import { loadPortalStaffOverview } from "@/lib/services/portalService";
import { MedewerkerDetail } from "@/components/portal/MedewerkerDetail";

const VALID_TABS = ["algemeen", "werkuren", "locaties", "rol", "account"] as const;
type TabKey = (typeof VALID_TABS)[number];

export default function PortalAccountPage() {
  const { checked, membership } = usePortalMembership();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [ownMembershipId, setOwnMembershipId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!checked || !membership || !user) return;
    let cancelled = false;
    loadPortalStaffOverview(membership.organizationId).then((all) => {
      if (cancelled) return;
      const own = all.find((m) => m.kind === "member" && m.userId === user.id);
      setOwnMembershipId(own?.id ?? null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [checked, membership, user]);

  const tabParam = searchParams.get("tab");
  const initialTab = (VALID_TABS as readonly string[]).includes(tabParam ?? "") ? (tabParam as TabKey) : undefined;

  if (loading) return <p className="p-6 text-sm text-gray-400">Laden…</p>;
  if (!ownMembershipId) return <p className="p-6 text-sm text-gray-400">Kon je accountgegevens niet vinden.</p>;
  return <MedewerkerDetail membershipId={ownMembershipId} hideAccountDangerActions initialTab={initialTab} />;
}
