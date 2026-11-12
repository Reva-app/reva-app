import type { SupabaseClient } from "@supabase/supabase-js";

export interface PushBrand { name: string; icon: string | null }

/**
 * Praktijk per gebruiker voor pushmeldingen (server, service role): een
 * medewerker via het lidmaatschap, een patiënt via het dossier, maar alleen
 * als dat bij een echte praktijk hoort (met actieve medewerkers; niet de
 * persoonlijke werkruimte). Het icoon is het praktijklogo via de publieke
 * route /api/org-logo (alleen PNG).
 */
export async function loadPushBrands(admin: SupabaseClient, userIds: string[], origin: string): Promise<Map<string, PushBrand>> {
  const out = new Map<string, PushBrand>();
  if (userIds.length === 0) return out;
  type Org = { id: string; name: string; logo_path: string | null };
  const toBrand = (o: Org): PushBrand => ({
    name: o.name,
    icon: o.logo_path?.endsWith(".png") ? `${origin}/api/org-logo/${o.id}?v=${encodeURIComponent(o.logo_path.split("/").pop() ?? "1")}` : null,
  });

  const { data: members } = await admin
    .from("memberships")
    .select("user_id, organizations(id, name, logo_path)")
    .in("user_id", userIds)
    .eq("status", "active");
  for (const m of members ?? []) {
    const org = m.organizations as unknown as Org | null;
    if (org && !out.has(m.user_id as string)) out.set(m.user_id as string, toBrand(org));
  }

  const rest = userIds.filter((id) => !out.has(id));
  if (rest.length === 0) return out;
  const { data: patients } = await admin
    .from("patients")
    .select("user_id, organizations(id, name, logo_path)")
    .in("user_id", rest);
  const orgIds = [...new Set((patients ?? []).map((p) => (p.organizations as unknown as Org | null)?.id).filter(Boolean))] as string[];
  if (orgIds.length === 0) return out;
  const { data: staff } = await admin.from("memberships").select("organization_id").in("organization_id", orgIds).eq("status", "active");
  const practices = new Set((staff ?? []).map((s) => s.organization_id as string));
  for (const p of patients ?? []) {
    const org = p.organizations as unknown as Org | null;
    if (org && practices.has(org.id)) out.set(p.user_id as string, toBrand(org));
  }
  return out;
}

/** Praktijknaam als titel; de eigen titel gaat dan vooraan in de tekst. */
export function brandedPayload(p: { title: string; body: string; url?: string; tag?: string }, brand: PushBrand | undefined) {
  if (!brand) return { title: p.title, body: p.body, url: p.url ?? "/", tag: p.tag };
  const sep = /[.?!:]$/.test(p.title) ? " " : ": ";
  return { title: brand.name, body: `${p.title}${sep}${p.body}`, url: p.url ?? "/", tag: p.tag, icon: brand.icon ?? undefined };
}
