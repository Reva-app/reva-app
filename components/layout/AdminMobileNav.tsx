"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Kanban, Users, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/organisaties", label: "Bedrijven", icon: Building2 },
  { href: "/admin/pijplijn", label: "Pijplijn", icon: Kanban },
  { href: "/admin/gebruikers", label: "Gebruikers", icon: Users },
];

/**
 * Bottom-nav voor mobiel, zelfde patroon als PortalMobileNav — vervangt de
 * horizontaal scrollende chip-balk. Met maar 4 bestemmingen is een "Meer"-
 * overflow niet nodig; alles past direct in de balk. Bevat ook meteen
 * uitloggen, dat op mobiel voorheen nergens bereikbaar was (alleen in de
 * desktop-zijbalk).
 */
export function AdminMobileNav() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "#18181a",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-end h-16 px-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center justify-end gap-1 pb-2 touch-press">
              <Icon size={20} style={{ color: active ? "#e8632a" : "#5a5a6a" }} strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium leading-none" style={{ color: active ? "#ffffff" : "#5a5a6a" }}>
                {label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={signOut}
          className="flex-1 flex flex-col items-center justify-end gap-1 pb-2 touch-press"
        >
          <LogOut size={20} style={{ color: "#5a5a6a" }} strokeWidth={1.8} />
          <span className="text-[10px] font-medium leading-none" style={{ color: "#5a5a6a" }}>
            Uitloggen
          </span>
        </button>
      </div>
    </nav>
  );
}
