import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import webpush from "web-push";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit";

/**
 * Stuurt een testmelding naar alle aangemelde apparaten van de ingelogde
 * gebruiker (Instellingen → Pushmeldingen → "Testmelding sturen").
 * Verlopen abonnementen (404/410) worden direct opgeruimd.
 */
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!service || !publicKey || !privateKey) {
    return NextResponse.json({ error: "Pushmeldingen zijn nog niet geconfigureerd op de server." }, { status: 500 });
  }

  const { data: { user } } = await createSupabaseClient(url, anon).auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!(await checkRateLimit(`push-test:${user.id}`, 5, 60 * 10))) return rateLimitedResponse();

  const admin = createSupabaseClient(url, service);
  const { data: subs } = await admin.from("web_push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", user.id);
  if (!subs?.length) return NextResponse.json({ error: "Er is nog geen apparaat aangemeld." }, { status: 400 });

  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:info@reva-app.nl", publicKey, privateKey);
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: "REVA", body: "Pushmeldingen staan aan. Zo zie je straks je herinneringen.", url: "/instellingen", tag: "test" }),
        { TTL: 60 }
      );
      sent++;
      await admin.from("web_push_subscriptions").update({ last_used_at: new Date().toISOString() }).eq("id", s.id);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await admin.from("web_push_subscriptions").delete().eq("id", s.id);
      else console.error("[push/test]", status, (e as Error).message);
    }
  }
  if (sent === 0) return NextResponse.json({ error: "Versturen is niet gelukt. Zet pushmeldingen uit en weer aan." }, { status: 502 });
  return NextResponse.json({ sent });
}
