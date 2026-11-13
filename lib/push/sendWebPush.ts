import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { loadPushBrands, brandedPayload } from "@/lib/push/practiceBrand";

export interface WebPushItem { userId: string; title: string; body: string; url?: string; tag?: string }

/**
 * Bezorgt webpushmeldingen (server, service role) in de stijl van de
 * praktijk en ruimt verlopen abonnementen (404/410) op. Gedeeld door
 * /api/push/send (herinneringen) en /api/push/patient-update.
 */
export async function sendWebPush(admin: SupabaseClient, pushes: WebPushItem[], origin: string): Promise<{ sent: number; failed: number; removed: number }> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey || pushes.length === 0) return { sent: 0, failed: 0, removed: 0 };
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:info@reva-app.nl", publicKey, privateKey);

  const userIds = [...new Set(pushes.map((p) => p.userId))];
  const { data: subs } = await admin.from("web_push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", userIds);
  const brands = await loadPushBrands(admin, userIds, origin);

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
  return { sent, failed, removed: stale.length };
}
