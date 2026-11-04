import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { pngDimensions } from "@/lib/email/layout";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Publieke URL voor het logo van een praktijk — nodig in e-mails, die geen
 * ingelogde sessie hebben (de bucket organization-logos is privé). Een
 * praktijklogo is publieke huisstijl, geen persoonsgegeven.
 *
 * Serveert uitsluitend PNG: een SVG op dit domein zou een stored-XSS-vector
 * zijn (script in het bestand). De portal zet elk logo bij het uploaden al om
 * naar PNG (lib/logoImage.ts); oudere logo's in een ander formaat krijgen een
 * 404 en de mail valt dan terug op de praktijknaam.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return new Response("Niet gevonden", { status: 404 });

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return new Response("Niet beschikbaar", { status: 500 });
  const admin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);

  const { data: org } = await admin.from("organizations").select("logo_path").eq("id", id).maybeSingle();
  const logoPath = org?.logo_path as string | null | undefined;
  if (!logoPath || !logoPath.endsWith(".png")) return new Response("Niet gevonden", { status: 404 });

  const { data: file, error } = await admin.storage.from("organization-logos").download(logoPath);
  if (error || !file) return new Response("Niet gevonden", { status: 404 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!pngDimensions(bytes)) return new Response("Niet gevonden", { status: 404 });

  return new Response(bytes, {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(bytes.byteLength),
      // De URL bevat ?v=<logopad>: een nieuw logo krijgt een nieuwe URL, dus
      // lang cachen is veilig.
      "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
