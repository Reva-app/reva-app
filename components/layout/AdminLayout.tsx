"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Users } from "lucide-react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminGate } from "@/components/auth/AdminGate";

const mobileNav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/organisaties", label: "Organisaties", icon: Building2 },
  { href: "/admin/gebruikers", label: "Gebruikers", icon: Users },
];

function AdminMobileTopBar() {
  const pathname = usePathname();
  return (
    <div className="lg:hidden" style={{ background: "#18181a" }}>
      <div className="px-4 py-4 flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "#e8632a" }}
        >
          <span className="text-white font-bold text-[10px]">R</span>
        </div>
        <p className="text-white font-semibold text-sm">REVA Platform Admin</p>
      </div>
      <div className="flex items-center gap-1 px-3 pb-3 overflow-x-auto">
        {mobileNav.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
              style={{
                color: isActive ? "#ffffff" : "#7c7c8a",
                background: isActive ? "rgba(255,255,255,0.07)" : "transparent",
              }}
            >
              <Icon size={13} style={{ color: isActive ? "#e8632a" : "#52525e" }} />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGate>
      <div className="flex h-full">
        <AdminSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <AdminMobileTopBar />
          <main
            className="flex-1 overflow-y-auto"
            style={{ background: "#f8f7f4" }}
          >
            {children}
          </main>
        </div>
      </div>
    </AdminGate>
  );
}
