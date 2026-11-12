import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Gedeelde rate-limit-helper voor de API-routes (feedback, send-invite,
 * mfa-reset, delete-account, delete-patient) — zie migratie
 * 086 voor de onderliggende, Postgres-gedeelde teller (bewust géén
 * in-memory teller, die zou per serverless-instance apart tellen en dus
 * geen echte bescherming bieden op Vercel).
 *
 * Roept check_rate_limit aan met de service-role-key: sinds migratie 121
 * mogen anon/authenticated die functie niet meer zelf aanroepen — anders kon
 * iedereen met de publieke anon-key een willekeurige bucket vullen (en zo
 * een andere gebruiker blokkeren) of de tabel onbeperkt laten groeien.
 *
 * Faalt open bij een onverwachte Supabase-fout: een storing in de limiter
 * zelf mag nooit de hele route platleggen.
 */
export async function checkRateLimit(
  bucket: string,
  maxHits: number,
  windowSeconds: number
): Promise<boolean> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error("[checkRateLimit] SUPABASE_SERVICE_ROLE_KEY is niet ingesteld");
    return true;
  }
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);
  const { data, error } = await client.rpc("check_rate_limit", {
    p_bucket: bucket,
    p_max_hits: maxHits,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[checkRateLimit] Supabase error:", error.message);
    return true;
  }
  return data === true;
}

/** Beste-poging IP-adres achter Vercel's proxy, voor rate limiting van niet-ingelogde routes. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitedResponse() {
  return NextResponse.json(
    { error: "Te veel verzoeken. Probeer het over enkele minuten opnieuw." },
    { status: 429 }
  );
}
