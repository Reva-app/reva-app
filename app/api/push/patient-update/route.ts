import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { sendWebPush } from "@/lib/push/sendWebPush";

const MESSAGES = {
  schema: { title: "Je schema is aangepast", body: "Je fysio heeft je oefeningen bijgewerkt. Bekijk wat er nieuw is.", url: "/training", tag: "schema" },
  fase: { title: "Door naar de volgende fase", body: "Je fysio heeft je volgende fase gestart. Mooi werk! Bekijk je nieuwe plan.", url: "/training", tag: "fase" },
  afgerond: { title: "Je behandeling is afgerond", body: "Hoe kijk je terug op je herstel? Laat het je praktijk weten.", url: "/", tag: "afgerond" },
} as const;

/**
 * Meldt een patiënt dat de fysio iets aan het herstelplan veranderde. De
 * afzender moet de patiënt mogen behandelen (zelfde controle als RLS:
 * can_manage_patient_protocol_content, met de sessie van de afzender).
 * Meerdere wijzigingen kort na elkaar geven één melding (30 minuten).
 * Algemene tekst: een melding staat op het vergrendelscherm.
 */
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!service || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return NextResponse.json({ sent: 0, skipped: "niet geconfigureerd" });

  const body = (await request.json().catch(() => ({}))) as { patientId?: string; kind?: keyof typeof MESSAGES };
  const kind = body.kind === "fase" || body.kind === "afgerond" ? body.kind : "schema";
  if (!body.patientId || !/^[0-9a-f-]{36}$/i.test(body.patientId)) return NextResponse.json({ error: "Ongeldige patiënt" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const asUser = createSupabaseClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: allowed } = await asUser.rpc("can_manage_patient_protocol_content", { p_patient_id: body.patientId });
  if (allowed !== true) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  // Eén melding per patiënt per half uur, ongeacht hoeveel er wordt aangepast.
  if (!(await checkRateLimit(`patient-update:${body.patientId}:${kind}`, 1, 30 * 60))) return NextResponse.json({ sent: 0, skipped: "recent gemeld" });

  const admin = createSupabaseClient(url, service);
  const { data: patient } = await admin.from("patients").select("user_id, status").eq("id", body.patientId).maybeSingle();
  if (!patient?.user_id || patient.status !== "active") return NextResponse.json({ sent: 0, skipped: "geen app-account" });

  const result = await sendWebPush(admin, [{ userId: patient.user_id as string, ...MESSAGES[kind] }], new URL(request.url).origin);
  return NextResponse.json(result);
}
