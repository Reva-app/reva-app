import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { timingSafeEqual } from "node:crypto";
import { EMAIL_REPLY_TO, emailFrom, renderEmail, type EmailBrand } from "@/lib/email/layout";
import { weeklyDigestEmail } from "@/lib/email/messages";
import { loadEmailLogo } from "@/lib/email/practiceLogo";
import { overviewKpis, formatKpi } from "@/lib/reports/reports";
import type { ReportData } from "@/lib/services/reportService";

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const CLOSED_STATUSES = new Set(["paused", "suspended", "cancelled", "closed", "inactive"]);

/**
 * Wekelijks overzicht voor praktijkeigenaren (maandagochtend, aangeroepen
 * door de Edge Function send-checkin-reminder met PUSH_DISPATCH_SECRET).
 * Rekent met dezelfde code als het Analyse-overzicht (lib/reports), over
 * de afgelopen 7 dagen t.o.v. de 7 dagen ervoor.
 *
 * Body (optioneel): { dryRun: true } stelt alles samen zonder te versturen;
 * { organizationId } beperkt tot één praktijk.
 */
export async function POST(request: Request) {
  const secret = process.env.PUSH_DISPATCH_SECRET;
  const given = request.headers.get("x-push-secret") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!service) return NextResponse.json({ error: "Niet geconfigureerd" }, { status: 500 });
  const body = (await request.json().catch(() => ({}))) as { dryRun?: boolean; organizationId?: string };
  const dryRun = body.dryRun === true || !resendKey;

  const admin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, service);
  const origin = new URL(request.url).origin;

  const { data: ownerRole } = await admin.from("roles").select("id").eq("key", "organization_owner").maybeSingle();
  let q = admin.from("memberships").select("user_id, organization_id").eq("status", "active").eq("role_id", ownerRole?.id ?? "");
  if (body.organizationId) q = q.eq("organization_id", body.organizationId);
  const { data: owners } = await q;
  if (!owners?.length) return NextResponse.json({ sent: 0, organizations: 0 });

  const userIds = [...new Set(owners.map((o) => o.user_id as string))];
  const [{ data: profiles }, { data: prefs }] = await Promise.all([
    admin.from("profiles").select("id, email, first_name, full_name").in("id", userIds),
    admin.from("user_email_prefs").select("user_id, weekly_digest").in("user_id", userIds),
  ]);
  const optedOut = new Set((prefs ?? []).filter((p) => p.weekly_digest === false).map((p) => p.user_id as string));

  const today = new Date(); today.setHours(12, 0, 0, 0);
  const to = new Date(today.getTime() - DAY), from = new Date(today.getTime() - 7 * DAY);
  const prevTo = new Date(from.getTime() - DAY), prevFrom = new Date(from.getTime() - 7 * DAY);
  const periodLabel = `${from.toLocaleDateString("nl-NL", { day: "numeric", month: "long" })} t/m ${to.toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}`;

  const resend = resendKey ? new Resend(resendKey) : null;
  const results: { organization: string; to: string; sent: boolean; kpis: { label: string; value: string }[]; highlights: string[] }[] = [];

  for (const orgId of [...new Set(owners.map((o) => o.organization_id as string))]) {
    const { data: org } = await admin.from("organizations").select("id, name, status, primary_color, logo_path").eq("id", orgId).maybeSingle();
    if (!org || CLOSED_STATUSES.has(String(org.status))) continue;
    const recipients = owners.filter((o) => o.organization_id === orgId).map((o) => profiles?.find((p) => p.id === o.user_id)).filter((p): p is NonNullable<typeof p> => !!p?.email && !optedOut.has(p.id));
    if (recipients.length === 0) continue;

    const [{ data: cur }, { data: prev }, { count: intakes }] = await Promise.all([
      admin.rpc("portal_report_data", { p_organization_id: orgId, p_from: iso(from), p_to: iso(to) }),
      admin.rpc("portal_report_data", { p_organization_id: orgId, p_from: iso(prevFrom), p_to: iso(prevTo) }),
      admin.from("patient_intakes").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "submitted"),
    ]);
    const d = cur as ReportData | null;
    if (!d || d.patients.filter((p) => p.status === "active").length === 0) continue;

    const kpis = overviewKpis(d, prev as ReportData | null).map((k) => {
      const delta = k.value !== null && k.prev !== null && k.prev !== 0 ? Math.round(((k.value - k.prev) / Math.abs(k.prev)) * 100) : null;
      return { label: k.label, value: `${formatKpi(k.value, k.format)}${delta !== null && delta !== 0 ? ` (${delta > 0 ? "+" : ""}${delta}%)` : ""}` };
    });
    const daysSince = (s: string) => Math.round((today.getTime() - new Date(`${s}T12:00:00`).getTime()) / DAY);
    const active = d.patients.filter((p) => p.status === "active");
    const quiet = active.filter((p) => !p.last_checkin || daysSince(p.last_checkin) > 14).length;
    const highPain = active.filter((p) => (p.pain_last ?? 0) >= 7).length;
    const fb = (d.feedback ?? []).filter((f) => !f.declined && f.satisfaction !== null);
    const highlights = [
      quiet ? `${quiet} ${quiet === 1 ? "patiënt is" : "patiënten zijn"} langer dan 14 dagen stil.` : "Alle actieve patiënten deden de afgelopen 2 weken een check-in. Mooi!",
      ...(highPain ? [`${highPain} ${highPain === 1 ? "patiënt meldt" : "patiënten melden"} een pijnscore van 7 of hoger.`] : []),
      ...(intakes ? [`${intakes} ingevulde ${intakes === 1 ? "intake wacht" : "intakes wachten"} op een herstelplan.`] : []),
      ...(fb.length ? [`${fb.length} ${fb.length === 1 ? "nieuwe reactie" : "nieuwe reacties"} op de tevredenheidsvraag.`] : []),
    ];

    const logo = await loadEmailLogo(admin, origin, orgId, org.logo_path as string | null);
    const brand: EmailBrand = { kind: "practice", name: org.name as string, color: org.primary_color as string | null, logo };

    for (const r of recipients) {
      const isDemo = String(r.email).toLowerCase().endsWith("@demo.reva-app.nl");
      const firstName = (r.first_name as string | null) ?? String(r.full_name ?? "").split(" ")[0] ?? "";
      const content = weeklyDigestEmail({ brand, siteUrl: origin, firstName, organizationName: org.name as string, periodLabel, kpis, highlights });
      let sent = false;
      if (!dryRun && !isDemo && resend) {
        const { subject, html, text } = renderEmail(content);
        const { error } = await resend.emails.send({ from: emailFrom(brand), to: r.email as string, subject, html, text, replyTo: EMAIL_REPLY_TO });
        if (error) console.error("[digest/weekly]", error.message); else sent = true;
      }
      results.push({ organization: org.name as string, to: isDemo ? "(demo)" : "(eigenaar)", sent, kpis, highlights });
    }
  }

  return NextResponse.json({ dryRun, sent: results.filter((r) => r.sent).length, results });
}
