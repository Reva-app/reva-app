"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardCheck,
  Dumbbell,
  FolderOpen,
  BarChart2,
  Settings,
  Pill,
  Target,
  BookOpen,
} from "lucide-react";
import { useAppData } from "@/lib/store";

const primaryNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dagboek", label: "Dagboek", icon: BookOpen },
  { href: "/check-in", label: "Check-in", icon: ClipboardCheck },
  { href: "/doelstellingen", label: "Doelstellingen", icon: Target },
  { href: "/training", label: "Training", icon: Dumbbell },
  { href: "/medicatie", label: "Medicatie", icon: Pill },
  { href: "/dossier", label: "Dossier", icon: FolderOpen },
];

const secondaryNav = [
  { href: "/analyse", label: "Analyse", icon: BarChart2 },
  { href: "/instellingen", label: "Instellingen", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, dagsSindsBlessure, fase, hydrated } = useAppData();

  const initials = hydrated
    ? profile.naam.split(" ").filter(Boolean).map((w) => w[0].toUpperCase()).slice(0, 2).join("")
    : "";

  const NavLink = ({
    href,
    label,
    icon: Icon,
  }: {
    href: string;
    label: string;
    icon: React.ElementType;
  }) => {
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
        <Icon size={16} style={{ color: isActive ? "#e8632a" : "#52525e" }} />
        {label}
      </Link>
    );
  };

  return (
    <aside
      className="hidden lg:flex flex-col w-56 shrink-0"
      style={{ background: "#18181a", borderRight: "1px solid rgba(255,255,255,0.05)" }}
    >
      {/* Logo */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "#e8632a" }}
          >
            <span className="text-white font-bold text-xs">R</span>
          </div>
          <div className="leading-none">
            <p className="text-white font-semibold text-sm tracking-tight">REVA</p>
            <p className="text-[11px] mt-0.5" style={{ color: "#52525e" }}>Herstel Dashboard</p>
          </div>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-2.5 space-y-0.5">
        {primaryNav.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      {/* Divider + secondary nav */}
      <div className="px-2.5 pb-3">
        <div className="my-3" style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />
        {secondaryNav.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </div>

      {/* User card */}
      <div
        className="mx-2.5 mb-3 px-3 py-3 rounded-xl"
        style={{ background: "rgba(255,255,255,0.04)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
            style={{ background: hydrated && profile.profielfoto ? "transparent" : "#e8632a" }}
          >
            {hydrated && profile.profielfoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.profielfoto} alt="Profielfoto" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="overflow-hidden min-w-0">
            <p className="text-white text-xs font-medium truncate">
              {hydrated ? profile.naam : ""}
            </p>
            <p className="text-[11px] truncate" style={{ color: "#52525e" }}>
              {hydrated ? `Dag ${dagsSindsBlessure} — ${fase.split(" — ")[0]}` : ""}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
