import { Resend } from "resend";
import { NextResponse } from "next/server";

// Escapes HTML-significant characters so user input can't break out of the
// markup it's interpolated into (e.g. inject <img>/<a> tags into the outbound email).
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Strips newlines so user input can't be used for header/subject-line injection.
function stripNewlines(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[feedback] RESEND_API_KEY is niet ingesteld");
      return NextResponse.json({ error: "E-mail service niet geconfigureerd" }, { status: 500 });
    }

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
      html: `
        <div style="font-family: sans-serif; max-width: 560px; color: #1a1a1a;">
          <h2 style="margin: 0 0 16px; font-size: 20px;">Nieuw feedbackbericht via REVA</h2>
          ${categorie ? `<p style="margin: 0 0 8px;"><strong>Categorie:</strong> ${escapeHtml(categorie)}</p>` : ""}
          <p style="margin: 0 0 8px;"><strong>Onderwerp:</strong> ${escapeHtml(onderwerp)}</p>
          ${naam ? `<p style="margin: 0 0 8px;"><strong>Van:</strong> ${escapeHtml(naam)}</p>` : ""}
          ${email ? `<p style="margin: 0 0 8px;"><strong>E-mail:</strong> ${escapeHtml(email)}</p>` : ""}
          <hr style="border: none; border-top: 1px solid #e8e5df; margin: 16px 0;" />
          <p style="white-space: pre-wrap; margin: 0;">${escapeHtml(bericht)}</p>
          <hr style="border: none; border-top: 1px solid #e8e5df; margin: 24px 0 16px;" />
          <p style="font-size: 12px; color: #9ca3af;">Verstuurd via REVA Herstel Dashboard</p>
        </div>
      `,
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
