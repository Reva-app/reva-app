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
} from "lucide-react";

// ─── All candidate nav pages ───────────────────────────────────────────────────

const ALL_NAV = [
  { href: "/",              label: "Dashboard",    icon: LayoutDashboard },
  { href: "/dagboek",       label: "Dagboek",      icon: BookOpen },
  { href: "/training",      label: "Training",     icon: Dumbbell },
  { href: "/medicatie",     label: "Medicatie",    icon: Pill },
  { href: "/dossier",       label: "Dossier",      icon: FolderOpen },
  { href: "/doelstellingen",label: "Doelen",       icon: Target },
  { href: "/analyse",       label: "Analyse",      icon: BarChart2 },
  { href: "/instellingen",  label: "Instellingen", icon: Settings },
];

const meerNav = ALL_NAV.filter(n =>
  !["/", "/dagboek", "/training"].includes(n.href)
);

const RECENT_KEY  = "reva_recent_pages";
const DEFAULT_RECENT = ["/", "/dagboek", "/training"];

// ─── Component ─────────────────────────────────────────────────────────────────

export function MobileNav() {
  const pathname = usePathname();
  const [meerOpen, setMeerOpen] = useState(false);
  const [recentPages, setRecentPages] = useState<string[]>(DEFAULT_RECENT);

  // Hydration-safe: load from localStorage after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) setRecentPages(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  // Track navigation — update recent pages on every route change
  useEffect(() => {
    setMeerOpen(false);
    if (!ALL_NAV.some(n => n.href === pathname)) return;
    setRecentPages(prev => {
      const updated = [pathname, ...prev.filter(p => p !== pathname)].slice(0, 6);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, [pathname]);

  // Derive 3 dynamic items from recent history
  const dynamicNav = recentPages
    .filter(p => ALL_NAV.some(n => n.href === p))
    .slice(0, 3)
    .map(p => ALL_NAV.find(n => n.href === p)!);

  // Ensure we always have exactly 3 (fill with defaults if needed)
  if (dynamicNav.length < 3) {
    for (const d of DEFAULT_RECENT) {
      if (dynamicNav.length >= 3) break;
      if (!dynamicNav.some(n => n.href === d)) {
        const found = ALL_NAV.find(n => n.href === d);
        if (found) dynamicNav.push(found);
      }
    }
  }

  const [left1, left2, right1] = dynamicNav;

  const isCheckIn    = pathname === "/check-in";
  const isMeerActive = ALL_NAV.some(n => n.href === pathname && !dynamicNav.some(d => d.href === n.href));

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

          {/* Left item 1 */}
          {left1 && (() => {
            const { href, label, icon: Icon } = left1;
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className="flex-1 flex flex-col items-center justify-end gap-1 pb-2 touch-press">
                <Icon size={22} style={{ color: active ? "#e8632a" : "#5a5a6a" }} strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-[10px] font-medium leading-none" style={{ color: active ? "#ffffff" : "#5a5a6a" }}>
                  {label}
                </span>
              </Link>
            );
          })()}

          {/* Left item 2 */}
          {left2 && (() => {
            const { href, label, icon: Icon } = left2;
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className="flex-1 flex flex-col items-center justify-end gap-1 pb-2 touch-press">
                <Icon size={22} style={{ color: active ? "#e8632a" : "#5a5a6a" }} strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-[10px] font-medium leading-none" style={{ color: active ? "#ffffff" : "#5a5a6a" }}>
                  {label}
                </span>
              </Link>
            );
          })()}

          {/* Center — raised Check-in button */}
          <div className="flex-1 flex flex-col items-center" style={{ paddingBottom: "6px" }}>
            <Link href="/check-in" className="flex flex-col items-center gap-1 touch-press" style={{ marginTop: "-20px" }}>
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
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
              <span className="text-[10px] font-medium leading-none"
                style={{ color: isCheckIn ? "#ffffff" : "#9a9aaa" }}>
                Check-in
              </span>
            </Link>
          </div>

          {/* Right item 1 */}
          {right1 && (() => {
            const { href, label, icon: Icon } = right1;
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className="flex-1 flex flex-col items-center justify-end gap-1 pb-2 touch-press">
                <Icon size={22} style={{ color: active ? "#e8632a" : "#5a5a6a" }} strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-[10px] font-medium leading-none" style={{ color: active ? "#ffffff" : "#5a5a6a" }}>
                  {label}
                </span>
              </Link>
            );
          })()}

          {/* Meer button */}
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
          style={{ background: "rgba(0,0,0,0.45)", animation: "fadeIn 0.2s ease" }}
          onClick={() => setMeerOpen(false)}
        />
      )}

      {/* ── Meer slide-up sheet ──────────────────────────────────────── */}
      {meerOpen && (
        <div
          className="lg:hidden fixed left-0 right-0 z-50 rounded-t-2xl"
          style={{
            bottom: `calc(var(--nav-height) + env(safe-area-inset-bottom, 0px))`,
            background: "#1c1c1e",
            border: "1px solid rgba(255,255,255,0.07)",
            borderBottom: "none",
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

          {/* Grid of links — all pages */}
          <div className="grid grid-cols-3 gap-3 p-4" style={{ paddingBottom: "20px" }}>
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
                  <span className="text-[11px] font-medium text-center leading-tight"
                    style={{ color: active ? "#ffffff" : "#9ca3af" }}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
