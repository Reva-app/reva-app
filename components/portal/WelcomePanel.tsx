"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Check, MapPin, Palette, Users, HeartPulse } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { loadPortalBranding, markMembershipWelcomed, type PortalDashboardStats } from "@/lib/services/portalService";

const USPS = [
  "Nodig je hele team uit en regel rollen en rechten in een paar klikken.",
  "Beheer al je vestigingen overzichtelijk op één plek.",
  "Patiënten krijgen een eigen dashboard voor afspraken, oefeningen en voortgang.",
  "Alles in jouw eigen huisstijl — logo en kleur naar keuze.",
];

interface WelcomePanelProps {
  membershipId: string;
  organizationId: string;
  organizationName: string;
  stats: PortalDashboardStats;
  onDismiss: () => void;
}

export function WelcomePanel({ membershipId, organizationId, organizationName, stats, onDismiss }: WelcomePanelProps) {
  const [brandingSet, setBrandingSet] = useState<boolean | null>(null);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadPortalBranding(organizationId).then((branding) => {
      if (cancelled) return;
      setBrandingSet(!!branding?.primaryColor);
    });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  async function handleDismiss() {
    setDismissing(true);
    onDismiss();
    await markMembershipWelcomed(membershipId);
  }

  const checklist = [
    { label: "Voeg een vestiging toe", done: stats.locationCount > 1, href: "/portal/locaties", icon: MapPin },
    { label: "Stel je huisstijl in", done: brandingSet === true, href: "/portal/huisstijl", icon: Palette },
    { label: "Nodig een collega uit", done: stats.colleagueCount > 1, href: "/portal/medewerkers", icon: Users },
    { label: "Voeg je eerste patiënt toe", done: stats.patientCount > 0, href: "/portal/patienten", icon: HeartPulse },
  ];

  return (
    <Card className="relative">
      <button
        type="button"
        onClick={handleDismiss}
        disabled={dismissing}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Sluiten"
      >
        <X size={16} />
      </button>

      <div className="max-w-xl pr-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Welkom bij REVA, {organizationName}!</h2>
        <p className="text-sm text-gray-500 mb-4">
          Dit is jouw eigen omgeving om het hersteltraject van al je patiënten overzichtelijk te beheren — van eerste consult tot volledig herstel.
        </p>
        <ul className="space-y-1.5 mb-6">
          {USPS.map((usp) => (
            <li key={usp} className="flex items-start gap-2 text-sm text-gray-600">
              <Check size={14} className="mt-0.5 shrink-0" style={{ color: "var(--brand-accent, #e8632a)" }} />
              {usp}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {checklist.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-gray-50"
            style={{ borderColor: "#e8e5df" }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: item.done ? "#f0fdf4" : "#f8f7f4" }}
            >
              {item.done ? <Check size={15} style={{ color: "#16a34a" }} /> : <item.icon size={15} className="text-gray-400" />}
            </div>
            <span className={item.done ? "text-sm text-gray-400 line-through" : "text-sm text-gray-700 font-medium"}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>

      <Button size="sm" variant="secondary" onClick={handleDismiss} disabled={dismissing}>
        Aan de slag
      </Button>
    </Card>
  );
}
