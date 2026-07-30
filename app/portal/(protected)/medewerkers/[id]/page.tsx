"use client";

import { useParams } from "next/navigation";
import { MedewerkerDetail } from "@/components/portal/MedewerkerDetail";

export default function PortalStaffDetailPage() {
  const params = useParams();
  return (
    <MedewerkerDetail
      membershipId={params.id as string}
      backHref="/portal/medewerkers"
      backLabel="Terug naar medewerkers"
    />
  );
}
