"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { LayoutDashboard, HeartPulse, MapPin, Users, ClipboardList, ListChecks, Dumbbell, Palette, LogOut, BarChart3, History, CalendarRange, CreditCard } from "lucide-react";
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
  { href: "/portal/locaties", label: "Locaties", icon: MapPin },
  { href: "/portal/medewerkers", label: "Medewerkers", icon: Users },
  { href: "/portal/reserveringen", label: "Reserveringen", icon: CalendarRange },
];

/**
 * Gedeeld door PortalSidebar (desktop) en PortalLayout's mobiele menu, zodat
 * beide altijd dezelfde pagina's/rolgating tonen. `secondary` (Analyse,
 * Activiteitenlog) hoort onderaan de balk, boven het accountblok — zelfde
 * indeling als primaryNav/secondaryNav bij de patiënten-sidebar.
 */
export function getPortalNavItems(canManageBranding: boolean, canViewAnalytics: boolean, canViewAuditLog: boolean, canViewClinical: boolean) {
  // Behandelinhoud (herstelplannen, schema's, oefeningen) alleen voor klinische
  // rollen; de receptie ziet patiënten (NAW), locaties, medewerkers en de agenda.
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

export function PortalSidebar() {
  const pathname = usePathname();
  const { signOut, user } = useAuth();
  const { membership } = usePortalMembership();
  const { branding } = usePortalBranding();
  const canManageBranding = !!membership && MANAGE_BRANDING_ROLES.includes(membership.roleKey);
  const canViewAnalytics = !!membership && VIEW_ANALYTICS_ROLES.includes(membership.roleKey);
  const canViewAuditLog = !!membership && VIEW_AUDIT_LOG_ROLES.includes(membership.roleKey);
  const { primary, secondary } = getPortalNavItems(canManageBranding, canViewAnalytics, canViewAuditLog, canViewClinicalData(membership?.roleKey));

  const NavLink = ({
    href, label, icon: Icon,
  }: { href: string; label: string; icon: React.ElementType }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={clsx(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium",
          !isActive && "hover:bg-white/5"
        )}
        style={{
          color: isActive ? "#ffffff" : "#7c7c8a",
          background: isActive ? "rgba(255,255,255,0.07)" : undefined,
        }}
      >
        <Icon size={16} style={{ color: isActive ? "var(--brand-accent, #e8632a)" : "#52525e" }} />
        {label}
      </Link>
    );
  };

  return (
    <aside
      className="hidden lg:flex flex-col w-56 shrink-0"
      style={{ background: "#18181a", borderRight: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="px-5 py-5">
        <div className="flex items-center gap-2.5">
          <BrandMark logoUrl={branding?.logoUrl} initial={(membership?.organizationName || "R")[0]} />
          <div className="leading-none min-w-0">
            <p className="text-white font-semibold text-sm tracking-tight truncate">
              {membership?.organizationName ?? "REVA"}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "#52525e" }}>Practice Portal</p>
          </div>
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

      <div className="mx-2.5 mb-3 px-3 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-2.5">
          <Link href="/portal/account" className="flex items-center gap-2.5 flex-1 min-w-0 rounded-lg -m-1 p-1 transition-colors hover:bg-white/5">
            <Avatar fullName={membership?.userFullName ?? null} email={user?.email} avatarUrl={membership?.avatarUrl ?? null} size={28} />
            <div className="overflow-hidden min-w-0 flex-1">
              <p className="text-white text-xs font-medium truncate">{membership?.userFullName || user?.email || ""}</p>
              <p className="text-[11px] truncate" style={{ color: "var(--brand-accent, #e8632a)" }}>Account instellingen</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={signOut}
            title="Uitloggen"
            className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ color: "var(--brand-accent, #e8632a)" }}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
