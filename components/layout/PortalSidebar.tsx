"use client";

import { BrandLockup } from "@/components/brand/BrandLockup";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useState } from "react";
import { LayoutDashboard, HeartPulse, MapPin, Users, ClipboardList, ListChecks, Dumbbell, Gauge, Palette, LogOut, BarChart3, History, CreditCard, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { usePortalBranding } from "@/lib/hooks/usePortalBranding";
import { Avatar } from "@/components/ui/Avatar";
import { MANAGE_BRANDING_ROLES, VIEW_ANALYTICS_ROLES, canViewClinicalData } from "@/lib/services/portalService";
import { VIEW_AUDIT_LOG_ROLES } from "@/lib/services/auditService";
import { BrandMark } from "@/components/brand/BrandMark";

const nav = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portal/patienten", label: "Patiënten", icon: HeartPulse },
  { href: "/portal/herstelplannen", label: "Herstelplannen", icon: ClipboardList, clinical: true },
  { href: "/portal/schemas", label: "Schema's", icon: ListChecks, clinical: true },
  { href: "/portal/oefeningen", label: "Oefeningen", icon: Dumbbell, clinical: true },
  { href: "/portal/testen", label: "Testen", icon: Gauge, clinical: true },
  { href: "/portal/locaties", label: "Locaties", icon: MapPin },
  { href: "/portal/medewerkers", label: "Medewerkers", icon: Users },
];

/**
 * Gedeeld door PortalSidebar (desktop) en PortalLayout's mobiele menu, zodat
 * beide altijd dezelfde pagina's/rolgating tonen. `secondary` (Analyse,
 * Activiteitenlog) hoort onderaan de balk, boven het accountblok — zelfde
 * indeling als primaryNav/secondaryNav bij de patiënten-sidebar.
 */
export function getPortalNavItems(canManageBranding: boolean, canViewAnalytics: boolean, canViewAuditLog: boolean, canViewClinical: boolean) {
  // Behandelinhoud (herstelplannen, schema's, oefeningen) alleen voor klinische
  // rollen; overige (oude) rollen zien alleen patiënten (NAW), locaties en medewerkers.
  const roleNav = nav.filter((item) => canViewClinical || !item.clinical);
  const primary = canManageBranding
    ? [...roleNav, { href: "/portal/huisstijl", label: "Huisstijl", icon: Palette }]
    : roleNav;

  const secondary = [
    ...(canViewAnalytics ? [{ href: "/portal/analyse", label: "Analyse", icon: BarChart3 }] : []),
    ...(canViewAuditLog ? [{ href: "/portal/activiteitenlog", label: "Activiteitenlog", icon: History }] : []),
    ...(canManageBranding ? [{ href: "/portal/abonnement", label: "Abonnement", icon: CreditCard }] : []),
  ];

  return { primary, secondary };
}

/**
 * Breedte van de zijbalk:
 * - "auto" (standaard): smalle strook met alleen iconen tussen 1024 en
 *   1280px (iPad liggend, kleine laptop), volledige balk vanaf 1280px;
 * - "rail" / "full": de keuze van de gebruiker, onthouden in localStorage.
 */
type SidebarMode = "auto" | "rail" | "full";
const SIDEBAR_KEY = "reva-portal-sidebar";

function readSidebarMode(): SidebarMode {
  try {
    const v = localStorage.getItem(SIDEBAR_KEY);
    return v === "rail" || v === "full" ? v : "auto";
  } catch {
    return "auto";
  }
}

export function PortalSidebar() {
  const pathname = usePathname();
  // De portal rendert pas na de PortalGate (client-side), dus localStorage is hier veilig.
  const [mode, setMode] = useState<SidebarMode>(readSidebarMode);
  /** Klassen per stand. Letterlijk uitgeschreven, zodat Tailwind ze in de broncode vindt. */
  const pick = (rail: string, full: string, auto: string) => (mode === "rail" ? rail : mode === "full" ? full : auto);
  const widthClass = pick("w-16", "w-56", "w-16 xl:w-56");
  const labelClass = pick("hidden", "inline", "hidden xl:inline");
  const blockClass = pick("hidden", "block", "hidden xl:block");
  const justifyClass = pick("justify-center", "justify-start", "justify-center xl:justify-start");

  function toggleMode() {
    const expandedNow = mode === "full" || (mode === "auto" && window.matchMedia("(min-width: 1280px)").matches);
    const nextMode: SidebarMode = expandedNow ? "rail" : "full";
    setMode(nextMode);
    try { localStorage.setItem(SIDEBAR_KEY, nextMode); } catch { /* privémodus: alleen voor nu */ }
  }
  const { signOut, user } = useAuth();
  const { membership } = usePortalMembership();
  const { branding } = usePortalBranding();
  const canManageBranding = !!membership && MANAGE_BRANDING_ROLES.includes(membership.roleKey);
  // Analyse: eigenaar ziet de praktijk, een behandelaar de eigen patiënten.
  const canViewAnalytics = !!membership && (VIEW_ANALYTICS_ROLES.includes(membership.roleKey) || canViewClinicalData(membership.roleKey));
  const canViewAuditLog = !!membership && VIEW_AUDIT_LOG_ROLES.includes(membership.roleKey);
  const { primary, secondary } = getPortalNavItems(canManageBranding, canViewAnalytics, canViewAuditLog, canViewClinicalData(membership?.roleKey));

  const NavLink = ({
    href, label, icon: Icon,
  }: { href: string; label: string; icon: React.ElementType }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        title={label}
        aria-label={label}
        className={clsx(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium",
          justifyClass,
          !isActive && "hover:bg-white/5"
        )}
        style={{
          color: isActive ? "#ffffff" : "#7c7c8a",
          background: isActive ? "rgba(255,255,255,0.07)" : undefined,
        }}
      >
        <Icon size={16} className="shrink-0" style={{ color: isActive ? "var(--brand-accent, #e8632a)" : "#8e8e9a" }} />
        <span className={labelClass}>{label}</span>
      </Link>
    );
  };

  return (
    <aside
      className={`hidden lg:flex flex-col shrink-0 transition-[width] duration-200 ${widthClass}`}
      style={{ background: "#18181a", borderRight: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className={pick("px-3 py-5", "px-5 py-5", "px-3 py-5 xl:px-5")}>
        {/* Smalle balk: alleen het beeldmerk; brede balk: logo/naam leesbaar */}
        <div className={clsx("flex items-center", justifyClass, pick("flex", "hidden", "flex xl:hidden"))}>
          <BrandMark logoUrl={branding?.logoUrl} initial={(membership?.organizationName || "R")[0]} />
        </div>
        <div className={pick("hidden", "block", "hidden xl:block")}>
          <BrandLockup
            logoUrl={branding?.logoUrl}
            initial={(membership?.organizationName || "R")[0]}
            name={membership?.organizationName ?? "REVA"}
            subtitle="Practice Portal"
          />
        </div>
      </div>

      <nav className="flex-1 px-2.5 space-y-0.5">
        {primary.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      {secondary.length > 0 && (
        <div className="px-2.5 pb-3">
          <div className="my-3" style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />
          {secondary.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>
      )}

      <div className="px-2.5 pb-1">
        <button
          type="button"
          onClick={toggleMode}
          title="Zijbalk in- of uitklappen"
          aria-label="Zijbalk in- of uitklappen"
          className={clsx("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors hover:bg-white/5", justifyClass)}
          style={{ color: "#8e8e9a" }}
        >
          <PanelLeftOpen size={16} className={clsx("shrink-0", pick("inline", "hidden", "inline xl:hidden"))} />
          <PanelLeftClose size={16} className={clsx("shrink-0", pick("hidden", "inline", "hidden xl:inline"))} />
          <span className={labelClass}>Inklappen</span>
        </button>
      </div>

      <div className={clsx("mx-2.5 mb-3 py-3 rounded-xl", pick("px-1.5", "px-3", "px-1.5 xl:px-3"))} style={{ background: "rgba(255,255,255,0.04)" }}>
        <div className={clsx("flex items-center gap-2.5", pick("flex-col", "flex-row", "flex-col xl:flex-row"))}>
          <Link href="/portal/account" title="Account instellingen" className={clsx("flex items-center gap-2.5 min-w-0 rounded-lg -m-1 p-1 transition-colors hover:bg-white/5", pick("justify-center", "flex-1", "justify-center xl:flex-1"))}>
            <Avatar fullName={membership?.userFullName ?? null} email={user?.email} avatarUrl={membership?.avatarUrl ?? null} size={28} />
            <div className={clsx("overflow-hidden min-w-0 flex-1", blockClass)}>
              <p className="text-white text-xs font-medium truncate">{membership?.userFullName || user?.email || ""}</p>
              <p className="text-[11px] truncate" style={{ color: "var(--brand-accent, #e8632a)" }}>Account instellingen</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={signOut}
            title="Uitloggen"
            aria-label="Uitloggen"
            className="relative tap-target shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ color: "var(--brand-accent, #e8632a)" }}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
