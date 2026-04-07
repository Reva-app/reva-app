import { Resend } from "resend";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[feedback] RESEND_API_KEY is niet ingesteld");
      return NextResponse.json({ error: "E-mail service niet geconfigureerd" }, { status: 500 });
    }

    const body = await request.json();
    const { categorie, onderwerp, bericht, naam, email } = body;

    if (!onderwerp?.trim() || !bericht?.trim()) {
      return NextResponse.json({ error: "Onderwerp en bericht zijn verplicht" }, { status: 400 });
    }

    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: "REVA Feedback <feedback@reva-app.nl>",
      to: "info@reva-app.nl",
      replyTo: email || undefined,
      subject: `[Feedback] ${categorie ? `${categorie} — ` : ""}${onderwerp}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; color: #1a1a1a;">
          <h2 style="margin: 0 0 16px; font-size: 20px;">Nieuw feedbackbericht via REVA</h2>
          ${categorie ? `<p style="margin: 0 0 8px;"><strong>Categorie:</strong> ${categorie}</p>` : ""}
          <p style="margin: 0 0 8px;"><strong>Onderwerp:</strong> ${onderwerp}</p>
          ${naam ? `<p style="margin: 0 0 8px;"><strong>Van:</strong> ${naam}</p>` : ""}
          ${email ? `<p style="margin: 0 0 8px;"><strong>E-mail:</strong> ${email}</p>` : ""}
          <hr style="border: none; border-top: 1px solid #e8e5df; margin: 16px 0;" />
          <p style="white-space: pre-wrap; margin: 0;">${bericht}</p>
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
