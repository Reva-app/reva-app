import type { SupabaseClient } from "@supabase/supabase-js";
import { emailLogoBox, pngDimensions, type EmailLogo } from "@/lib/email/layout";

/**
 * Praktijklogo voor in een e-mail: publieke URL via /api/org-logo plus de
 * weergavemaat (uit de PNG-kop gelezen). Null als er geen (PNG-)logo is —
 * de mail toont dan de praktijknaam. Vereist een service-role-client.
 *
 * Zelfde logica staat in supabase/functions/send-checkin-reminder/index.ts
 * (loadBrands), omdat de Edge Function niet uit lib/ kan importeren.
 */
export async function loadEmailLogo(
  admin: SupabaseClient,
  siteUrl: string,
  organizationId: string,
  logoPath: string | null | undefined
): Promise<EmailLogo | null> {
  if (!logoPath || !logoPath.endsWith(".png")) return null;
  const { data: file, error } = await admin.storage.from("organization-logos").download(logoPath);
  if (error || !file) return null;
  const size = pngDimensions(new Uint8Array(await file.arrayBuffer()));
  if (!size) return null;
  const version = encodeURIComponent(logoPath.split("/").pop() ?? "1");
  return {
    url: `${siteUrl}/api/org-logo/${organizationId}?v=${version}`,
    ...emailLogoBox(size.width, size.height),
  };
}
