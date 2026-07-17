import { createClient } from "@/lib/supabaseClient";
import type { PortalBranding } from "@/lib/services/portalService";

/**
 * Voor de patiëntenkant: haalt de huisstijl van de eigen organisatie op via
 * een beveiligde RPC. Patiënten hebben geen directe SELECT-rechten op
 * `organizations` (alleen organisatieleden via memberships, zie migratie
 * 018) — de RPC (migratie 039) geeft alleen de drie huisstijl-velden terug,
 * niet de rest van de organisatierij (kvk/btw/contactgegevens).
 */
export async function loadPatientOrganizationBranding(): Promise<PortalBranding | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("patient_organization_branding");
  if (error) {
    console.error(`[loadPatientOrganizationBranding] Supabase error — message: "${error.message}"`);
    return null;
  }
  const row = (data as { name: string; primary_color: string | null; logo_path: string | null }[] | null)?.[0];
  if (!row) return null;

  let logoUrl: string | null = null;
  if (row.logo_path) {
    const { data: signed, error: signErr } = await supabase.storage
      .from("organization-logos")
      .createSignedUrl(row.logo_path, 60 * 60);
    if (signErr) console.error(`[loadPatientOrganizationBranding(logo)] Supabase error — message: "${signErr.message}"`);
    logoUrl = signed?.signedUrl ?? null;
  }

  return {
    name: row.name,
    primaryColor: row.primary_color,
    logoPath: row.logo_path,
    logoUrl,
  };
}
