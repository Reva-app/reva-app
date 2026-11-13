import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sendWebPush, type WebPushItem } from "@/lib/push/sendWebPush";

/**
 * Bezorgt pushmeldingen namens de Edge Function send-checkin-reminder (die
 * bepaalt wie welke herinnering krijgt). Alleen met het gedeelde geheim
 * PUSH_DISPATCH_SECRET. Inhoud is altijd algemeen, nooit medisch.
 */
export async function POST(request: Request) {
  const secret = process.env.PUSH_DISPATCH_SECRET;
  const given = request.headers.get("x-push-secret") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !service) return NextResponse.json({ error: "Niet geconfigureerd" }, { status: 500 });

  const { pushes } = (await request.json().catch(() => ({ pushes: [] }))) as { pushes: WebPushItem[] };
  if (!Array.isArray(pushes) || pushes.length === 0) return NextResponse.json({ sent: 0 });

  const admin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, service);
  const result = await sendWebPush(admin, pushes, new URL(request.url).origin);
  return NextResponse.json(result);
}
