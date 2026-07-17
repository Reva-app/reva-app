"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, HeartPulse, MapPin, Users, Palette, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { usePortalBranding } from "@/lib/hooks/usePortalBranding";
import { MANAGE_BRANDING_ROLES } from "@/lib/services/portalService";

const nav = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portal/patienten", label: "Patiënten", icon: HeartPulse },
  { href: "/portal/locaties", label: "Vestigingen", icon: MapPin },
  { href: "/portal/medewerkers", label: "Medewerkers", icon: Users },
];

export function PortalSidebar() {
  const pathname = usePathname();
  const { signOut, user } = useAuth();
  const { membership } = usePortalMembership();
  const { branding } = usePortalBranding();
  const canManageBranding = !!membership && MANAGE_BRANDING_ROLES.includes(membership.roleKey);
  const navItems = canManageBranding
    ? [...nav, { href: "/portal/huisstijl", label: "Huisstijl", icon: Palette }]
    : nav;

  const NavLink = ({
    href, label, icon: Icon,
  }: { href: string; label: string; icon: React.ElementType }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium"
        style={{
          color: isActive ? "#ffffff" : "#7c7c8a",
          background: isActive ? "rgba(255,255,255,0.07)" : "transparent",
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
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ background: "var(--brand-accent, #e8632a)" }}>
            {branding?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold text-xs">{(membership?.organizationName || "R")[0].toUpperCase()}</span>
            )}
          </div>
          <div className="leading-none min-w-0">
            <p className="text-white font-semibold text-sm tracking-tight truncate">
              {membership?.organizationName ?? "REVA"}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "#52525e" }}>Practice Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2.5 space-y-0.5">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      <div className="mx-2.5 mb-3 px-3 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: "var(--brand-accent, #e8632a)" }}>
            {user?.email?.[0]?.toUpperCase() ?? "P"}
          </div>
          <div className="overflow-hidden min-w-0 flex-1">
            <p className="text-white text-xs font-medium truncate">{user?.email ?? ""}</p>
            <p className="text-[11px] truncate" style={{ color: "#52525e" }}>{membership?.roleName ?? ""}</p>
          </div>
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
