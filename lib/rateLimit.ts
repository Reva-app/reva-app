import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Gedeelde rate-limit-helper voor de API-routes (feedback, send-invite,
 * mfa-reset, delete-account, delete-patient) — zie migratie 086 voor de
 * onderliggende, Postgres-gedeelde teller (bewust géén in-memory teller,
 * die zou per serverless-instance apart tellen en dus geen echte
 * bescherming bieden op Vercel).
 *
 * Faalt open bij een onverwachte Supabase-fout: een storing in de limiter
 * zelf mag nooit de hele route platleggen.
 */
export async function checkRateLimit(
  client: SupabaseClient,
  bucket: string,
  maxHits: number,
  windowSeconds: number
): Promise<boolean> {
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
