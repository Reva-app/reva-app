"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { RevaGlyph } from "@/components/brand/RevaGlyph";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabaseClient";
import { applyBrandVars, writeBrandCache, type CachedBrand } from "@/lib/brandCache";

const KEY = "reva-brand";
const listeners = new Set<() => void>();
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function snapshot(): string | null { try { return localStorage.getItem(KEY); } catch { return null; } }
function notify() { listeners.forEach((l) => l()); }

/**
 * Huisstijl voor de schermen rond het inloggen: de laatst bekende praktijk
 * op dit apparaat, en zodra er een sessie is (uitnodiging, 2FA, e-mail
 * bevestigd) de actuele praktijk van de gebruiker.
 */
export function useAuthBrand(): CachedBrand | null {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  const brand = useMemo(() => {
    if (!raw) return null;
    try { return JSON.parse(raw) as CachedBrand; } catch { return null; }
  }, [raw]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: member } = await supabase
        .from("memberships")
        .select("organizations(name, primary_color, logo_path)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      let org = (member?.organizations as unknown as { name: string; primary_color: string | null; logo_path: string | null } | null) ?? null;
      if (!org) {
        const { data } = await supabase.rpc("patient_organization_branding");
        org = ((data ?? []) as { name: string; primary_color: string | null; logo_path: string | null }[])[0] ?? null;
      }
      if (cancelled || !org) return;
      writeBrandCache({ name: org.name, primaryColor: org.primary_color, logoPath: org.logo_path });
      applyBrandVars(org.primary_color);
      notify();
    })();
    return () => { cancelled = true; };
  }, [user]);

  return brand;
}

/**
 * Logo bovenaan inloggen, registreren, wachtwoord vergeten, 2FA en
 * uitnodigingen: de praktijk als die bekend is, anders REVA.
 */
export function AuthBrandHeader({ className = "mb-6", fallbackDark = false }: { className?: string; fallbackDark?: boolean }) {
  const brand = useAuthBrand();

  if (brand?.logoUrl) {
    return (
      <div className={`flex justify-center ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brand.logoUrl} alt={brand.name} className="h-12 sm:h-14 w-auto max-w-[240px] object-contain" />
      </div>
    );
  }
  if (brand?.name) {
    return (
      <div className={`flex justify-center ${className}`}>
        <BrandLockup initial={brand.name.charAt(0)} name={brand.name} tone="light" />
      </div>
    );
  }
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: fallbackDark ? "#18181a" : "var(--brand-accent, #e8632a)" }}>
        <RevaGlyph className="h-[18px] text-white" />
      </div>
      <span className="font-bold text-lg" style={{ color: "#1a1a1a" }}>REVA</span>
    </div>
  );
}

/** Kleine REVA-vermelding onder een scherm in praktijkstijl. */
export function PoweredByReva() {
  const brand = useAuthBrand();
  if (!brand?.name) return null;
  return <p className="text-center text-[11px] text-subtle mt-6">Mogelijk gemaakt door REVA</p>;
}
