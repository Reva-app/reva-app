import { Resend } from "resend";
import { NextResponse } from "next/server";
import { stripNewlines } from "@/lib/emailHtml";
import { renderEmail } from "@/lib/email/layout";
import { feedbackNotificationEmail } from "@/lib/email/messages";
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

    const allowed = await checkRateLimit(`feedback:${getClientIp(request)}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS);
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
    const { subject, html, text } = renderEmail(feedbackNotificationEmail({ categorie, onderwerp, naam, email, bericht }));

    // Interne mail: eigen afzendernaam, zodat feedback in de inbox
    // herkenbaar en te filteren is.
    const { error } = await resend.emails.send({
      from: "REVA Feedback <feedback@reva-app.nl>",
      to: "info@reva-app.nl",
      replyTo: email || undefined,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("[feedback] Resend error:", error);
      return NextResponse.json({ error: "Versturen is niet gelukt. Probeer het later opnieuw." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[feedback] Onverwachte fout:", err);
    return NextResponse.json(
      { error: "Er ging iets mis. Probeer het later opnieuw." },
      { status: 500 }
    );
  }
}
