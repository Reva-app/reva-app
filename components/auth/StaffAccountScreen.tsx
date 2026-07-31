"use client";

import { Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface StaffAccountScreenProps {
  organizationName: string;
  onSignOut: () => void;
}

/**
 * Blokkerend scherm voor een medewerker-/eigenaaraccount dat op het
 * patiëntendashboard belandt (elk account krijgt via ensure_personal_organization,
 * migratie 020, altijd ook een eigen persoonlijk patiëntdossier — zonder deze
 * gate zou dat dossier hier stilzwijgend getoond worden). Zelfde patroon als
 * AccountInactiveScreen: geen sluitknop, alleen bereikbaar via AuthGate.
 */
export function StaffAccountScreen({ organizationName, onSignOut }: StaffAccountScreenProps) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="relative w-full max-w-md rounded-2xl p-6 sm:p-8 shadow-2xl" style={{ background: "#ffffff" }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: "#fff3ee" }}>
          <Building2 size={22} style={{ color: "#e8632a" }} />
        </div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: "#1a1a1a" }}>
          Je bent ingelogd als medewerker
        </h2>
        <p className="text-sm leading-relaxed mb-6" style={{ color: "#6b6560" }}>
          Dit account is gekoppeld aan {organizationName} als fysio-portaal-account. Het patiëntendashboard is bedoeld voor patiënten — ga naar het fysio-portaal om verder te werken.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <Button size="sm" onClick={() => router.push("/portal")}>Naar fysio-portaal</Button>
          <Button variant="secondary" size="sm" onClick={onSignOut}>Uitloggen</Button>
        </div>
      </div>
    </div>
  );
}
