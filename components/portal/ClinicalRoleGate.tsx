"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { canViewClinicalData } from "@/lib/services/portalService";

/**
 * Laat de pagina alleen zien aan klinische rollen (eigenaar, therapeut).
 * Gebruikt in de layout.tsx van patiëntdossier, herstelplannen, schema's en
 * oefeningen. Dit is een UX-laag: de database weigert de klinische gegevens
 * zelf al (migratie 122), dit voorkomt alleen een halflege pagina.
 */
export function ClinicalRoleGate({ children }: { children: React.ReactNode }) {
  const { checked, membership } = usePortalMembership();

  if (!checked) return null;

  if (!canViewClinicalData(membership?.roleKey)) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <EmptyState
          icon={ShieldCheck}
          title="Alleen voor behandelaars"
          description="Deze pagina bevat medische gegevens en is alleen zichtbaar voor fysiotherapeuten en de praktijkeigenaar. Contactgegevens van patiënten vind je onder Patiënten."
          action={
            <Link href="/portal/patienten">
              <Button variant="secondary" size="sm">Naar patiënten</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}
