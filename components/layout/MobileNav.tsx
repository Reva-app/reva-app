"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  Dumbbell,
  MoreHorizontal,
  Pill,
  FolderOpen,
  Target,
  BarChart2,
  Settings,
  X,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

// ─── Navigation config ─────────────────────────────────────────────────────────

const FIXED_NAV = [
  { href: "/",         label: "Dashboard", icon: LayoutDashboard },
  { href: "/dagboek",  label: "Dagboek",   icon: BookOpen },
  { href: "/training", label: "Training",  icon: Dumbbell },
];

const ALL_NAV = [
  { href: "/",               label: "Dashboard",    icon: LayoutDashboard },
  { href: "/dagboek",        label: "Dagboek",      icon: BookOpen },
  { href: "/training",       label: "Trainingen",   icon: Dumbbell },
  { href: "/medicatie",      label: "Medicatie",    icon: Pill },
  { href: "/dossier",        label: "Dossier",      icon: FolderOpen },
  { href: "/doelstellingen", label: "Doelen",       icon: Target },
  { href: "/analyse",        label: "Analyse",      icon: BarChart2 },
  { href: "/instellingen",   label: "Instellingen", icon: Settings },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export function MobileNav() {
  const pathname = usePathname();
  const [meerOpen, setMeerOpen] = useState(false);
  const { signOut } = useAuth();

  // Close Meer sheet on navigation
  useEffect(() => {
    setMeerOpen(false);
  }, [pathname]);

  const isCheckIn = pathname === "/check-in";
  const isMeerActive = ALL_NAV.some(
    n => n.href === pathname && !FIXED_NAV.some(f => f.href === n.href) && pathname !== "/check-in"
  );

  return (
    <>
      {/* ── Bottom nav bar ──────────────────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: "#1c1c1e",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-end h-16 px-1">

          {/* Dashboard */}
          <NavItem href="/" label="Dashboard" icon={LayoutDashboard} active={pathname === "/"} />

          {/* Dagboek */}
          <NavItem href="/dagboek" label="Dagboek" icon={BookOpen} active={pathname === "/dagboek"} />

          {/* Center — raised Check-in button */}
          <div className="flex-1 flex flex-col items-center" style={{ paddingBottom: "6px" }}>
            <Link href="/check-in" className="flex flex-col items-center gap-1 touch-press" style={{ marginTop: "-20px" }}>
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: isCheckIn
                    ? "linear-gradient(135deg, #f0703a 0%, #d4541e 100%)"
                    : "linear-gradient(135deg, #e8632a 0%, #cc4e18 100%)",
                  boxShadow: isCheckIn
                    ? "0 6px 20px rgba(232,99,42,0.55)"
                    : "0 4px 16px rgba(232,99,42,0.4)",
                  border: "3px solid #1c1c1e",
                }}
              >
                <ClipboardCheck size={24} style={{ color: "#ffffff" }} strokeWidth={2.2} />
              </div>
              <span
                className="text-[10px] font-medium leading-none"
                style={{ color: isCheckIn ? "#ffffff" : "#9a9aaa" }}
              >
                Check-in
              </span>
            </Link>
          </div>

          {/* Trainingen */}
          <NavItem href="/training" label="Training" icon={Dumbbell} active={pathname === "/training"} />

          {/* Meer */}
          <button
            onClick={() => setMeerOpen((v) => !v)}
            className="flex-1 flex flex-col items-center justify-end gap-1 pb-2 touch-press"
          >
            <MoreHorizontal
              size={22}
              style={{ color: isMeerActive || meerOpen ? "#e8632a" : "#5a5a6a" }}
              strokeWidth={1.8}
            />
            <span
              className="text-[10px] font-medium leading-none"
              style={{ color: isMeerActive || meerOpen ? "#ffffff" : "#5a5a6a" }}
            >
              Meer
            </span>
          </button>

        </div>
      </nav>

      {/* ── Meer backdrop ────────────────────────────────────────────── */}
      {meerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.5)", animation: "fadeIn 0.2s ease" }}
          onClick={() => setMeerOpen(false)}
        />
      )}

      {/* ── Meer slide-up sheet ──────────────────────────────────────── */}
      {meerOpen && (
        <div
          className="lg:hidden fixed left-0 right-0 z-[45]"
          style={{
            bottom: `calc(var(--nav-height) + env(safe-area-inset-bottom, 0px))`,
            background: "#1c1c1e",
            borderTop: "1px solid rgba(255,255,255,0.10)",
            borderLeft: "1px solid rgba(255,255,255,0.07)",
            borderRight: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "20px 20px 0 0",
            animation: "sheetUp 0.28s cubic-bezier(0.32,0.72,0,1)",
          }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-8 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          </div>

          {/* Sheet header */}
          <div
            className="flex items-center justify-between px-5 pt-2 pb-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b6b7a" }}>
              Meer pagina&apos;s
            </p>
            <button
              onClick={() => setMeerOpen(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center touch-press"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <X size={14} style={{ color: "#9ca3af" }} />
            </button>
          </div>

          {/* Grid of links */}
          <div className="grid grid-cols-3 gap-3 p-4">
            {ALL_NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl touch-press"
                  style={{
                    background: active ? "rgba(232,99,42,0.15)" : "rgba(255,255,255,0.05)",
                    border: active ? "1px solid rgba(232,99,42,0.35)" : "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <Icon size={22} style={{ color: active ? "#e8632a" : "#9ca3af" }} strokeWidth={active ? 2.2 : 1.8} />
                  <span
                    className="text-[11px] font-medium text-center leading-tight"
                    style={{ color: active ? "#ffffff" : "#9ca3af" }}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Sign out row */}
          <div className="px-4 pb-5">
            <button
              type="button"
              onClick={signOut}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium touch-press"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "#9ca3af",
              }}
            >
              <LogOut size={16} style={{ color: "#6b7280" }} />
              Uitloggen
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Nav item ──────────────────────────────────────────────────────────────────

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex-1 flex flex-col items-center justify-end gap-1 pb-2 touch-press"
    >
      <Icon size={22} style={{ color: active ? "#e8632a" : "#5a5a6a" }} strokeWidth={active ? 2.2 : 1.8} />
      <span className="text-[10px] font-medium leading-none" style={{ color: active ? "#ffffff" : "#5a5a6a" }}>
        {label}
      </span>
    </Link>
  );
}
