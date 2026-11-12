import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import webpush from "web-push";
import { timingSafeEqual } from "node:crypto";
import { loadPushBrands, brandedPayload } from "@/lib/push/practiceBrand";

interface PushItem { userId: string; title: string; body: string; url?: string; tag?: string }

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
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!publicKey || !privateKey || !service) return NextResponse.json({ error: "Niet geconfigureerd" }, { status: 500 });

  const { pushes } = (await request.json().catch(() => ({ pushes: [] }))) as { pushes: PushItem[] };
  if (!Array.isArray(pushes) || pushes.length === 0) return NextResponse.json({ sent: 0 });

  const admin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, service);
  const userIds = [...new Set(pushes.map((p) => p.userId))];
  const { data: subs } = await admin.from("web_push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", userIds);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:info@reva-app.nl", publicKey, privateKey);
  // In de stijl van de praktijk: praktijknaam als titel, praktijklogo als icoon.
  const brands = await loadPushBrands(admin, userIds, new URL(request.url).origin);

  let sent = 0, failed = 0;
  const stale: string[] = [];
  for (const p of pushes) {
    for (const s of (subs ?? []).filter((x) => x.user_id === p.userId)) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(brandedPayload(p, brands.get(p.userId))),
          { TTL: 60 * 60 * 6 }
        );
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) stale.push(s.id);
        else failed++;
      }
    }
  }
  if (stale.length) await admin.from("web_push_subscriptions").delete().in("id", stale);
  return NextResponse.json({ sent, failed, removed: stale.length });
}
