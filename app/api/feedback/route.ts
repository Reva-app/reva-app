import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { NextResponse } from "next/server";
import { stripNewlines, feedbackEmailHtml } from "@/lib/emailHtml";
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/rateLimit";

// Onauthenticated route (iedereen kan feedback sturen, ook uitgelogd) — dus
// per IP-adres gelimiteerd i.p.v. per gebruiker.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 10 * 60;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[feedback] RESEND_API_KEY is niet ingesteld");
      return NextResponse.json({ error: "E-mail service niet geconfigureerd" }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const rateLimitClient = createSupabaseClient(supabaseUrl, anonKey);
    const allowed = await checkRateLimit(rateLimitClient, `feedback:${getClientIp(request)}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS);
    if (!allowed) return rateLimitedResponse();

    const body = await request.json();
    const categorie = typeof body.categorie === "string" ? stripNewlines(body.categorie).slice(0, 100) : "";
    const onderwerp = typeof body.onderwerp === "string" ? stripNewlines(body.onderwerp).slice(0, 200) : "";
    const naam      = typeof body.naam === "string" ? stripNewlines(body.naam).slice(0, 200) : "";
    const email     = typeof body.email === "string" ? stripNewlines(body.email).slice(0, 320) : "";
    const bericht   = typeof body.bericht === "string" ? body.bericht.slice(0, 5000) : "";

    if (!onderwerp.trim() || !bericht.trim()) {
      return NextResponse.json({ error: "Onderwerp en bericht zijn verplicht" }, { status: 400 });
    }

    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: "REVA Feedback <feedback@reva-app.nl>",
      to: "info@reva-app.nl",
      replyTo: email || undefined,
      subject: `[Feedback] ${categorie ? `${categorie}: ` : ""}${onderwerp}`,
      html: feedbackEmailHtml({ categorie, onderwerp, naam, email, bericht }),
    });

    if (error) {
      console.error("[feedback] Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[feedback] Onverwachte fout:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Onbekende fout" },
      { status: 500 }
    );
  }
}
