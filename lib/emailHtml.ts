/**
 * Gedeelde helpers voor server-side verstuurde e-mails (Resend). Gebruikt door
 * app/api/feedback/route.ts en app/api/send-invite/route.ts.
 */

// Escapes HTML-significant characters so user input can't break out of the
// markup it's interpolated into (e.g. inject <img>/<a> tags into the outbound email).
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Strips newlines so user input can't be used for header/subject-line injection.
export function stripNewlines(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

interface InviteEmailOptions {
  /** Hex kleur voor de koptekstband — organisatie's eigen huisstijlkleur, of het REVA-standaardoranje. */
  accentColor: string;
  /** Naam boven in de koptekstband, bv. de organisatienaam of "REVA". */
  headerLabel: string;
  /** Hoofdkop, bv. "Sanne, Fysio Cura Plaza nodigt je uit". */
  heading: string;
  /** Losse alinea's onder de kop — worden individueel HTML-geëscaped door de aanroeper. */
  bodyHtmlLines: string[];
  ctaLabel: string;
  ctaUrl: string;
}

/**
 * Platte-tekst-tegenhanger van inviteEmailHtml() — een e-mail zonder text/plain
 * deel wordt door veel spamfilters extra wantrouwend behandeld (alleen-HTML is
 * een bekend signaal voor massamail). bodyLines moet hier al platte tekst zijn
 * (geen HTML-tags), dus roep dit aan met dezelfde inhoud vóór het HTML-escapen.
 */
export function inviteEmailText({ headerLabel, heading, bodyLines, ctaLabel, ctaUrl }: {
  headerLabel: string; heading: string; bodyLines: string[]; ctaLabel: string; ctaUrl: string;
}): string {
  return [
    headerLabel,
    "",
    heading,
    "",
    ...bodyLines,
    "",
    `${ctaLabel}: ${ctaUrl}`,
    "",
    "REVA — vragen? Mail info@reva-app.nl",
  ].join("\n");
}

interface FeedbackEmailOptions {
  categorie: string;
  onderwerp: string;
  naam: string;
  email: string;
  bericht: string;
}

/**
 * Zelfde visuele basis als inviteEmailHtml() (koptekstband, kaart, voettekst),
 * maar zonder CTA-knop — dit is een interne notificatie aan info@reva-app.nl,
 * geen actie-mail aan een gebruiker. bericht wordt hier al HTML-geëscaped
 * (i.p.v. door de aanroeper), inclusief behoud van regeleinden.
 */
export function feedbackEmailHtml({ categorie, onderwerp, naam, email, bericht }: FeedbackEmailOptions): string {
  const rows = [
    categorie && { label: "Categorie", value: escapeHtml(categorie) },
    naam && { label: "Van", value: escapeHtml(naam) },
    email && { label: "E-mail", value: `<a href="mailto:${escapeHtml(email)}" style="color: #4b5563;">${escapeHtml(email)}</a>` },
  ].filter((r): r is { label: string; value: string } => !!r);

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f7f4; padding: 32px 16px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e8e5df;">
        <div style="background: #e8632a; padding: 20px 32px; color: #ffffff; font-weight: 700; font-size: 15px; letter-spacing: 0.01em;">
          REVA — Nieuw feedbackbericht
        </div>
        <div style="padding: 32px;">
          <h1 style="margin: 0 0 20px; font-size: 20px; color: #1a1a1a; line-height: 1.3;">${escapeHtml(onderwerp)}</h1>
          ${rows.length > 0 ? `
          <div style="margin: 0 0 20px; border: 1px solid #e8e5df; border-radius: 10px; overflow: hidden;">
            ${rows.map((r, i) => `
              <div style="display: flex; padding: 10px 16px; ${i > 0 ? "border-top: 1px solid #f0ede8;" : ""} background: ${i % 2 === 0 ? "#fafaf8" : "#ffffff"};">
                <span style="width: 90px; flex-shrink: 0; font-size: 12px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.02em;">${r.label}</span>
                <span style="font-size: 14px; color: #1a1a1a;">${r.value}</span>
              </div>
            `).join("")}
          </div>` : ""}
          <div style="background: #f8f7f4; border-radius: 10px; padding: 16px 20px; font-size: 14px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(bericht)}</div>
        </div>
        <div style="padding: 4px 32px 20px; font-size: 12px; color: #9ca3af;">
          Verstuurd via REVA Herstel Dashboard
        </div>
      </div>
    </div>
  `;
}

/** Gedeelde basislayout voor uitnodigingsmails — koptekstband, kaart, CTA-knop, voettekst. */
export function inviteEmailHtml({ accentColor, headerLabel, heading, bodyHtmlLines, ctaLabel, ctaUrl }: InviteEmailOptions): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f7f4; padding: 32px 16px;">
      <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e8e5df;">
        <div style="background: ${accentColor}; padding: 20px 32px; color: #ffffff; font-weight: 700; font-size: 15px; letter-spacing: 0.01em;">
          ${escapeHtml(headerLabel)}
        </div>
        <div style="padding: 32px;">
          <h1 style="margin: 0 0 16px; font-size: 22px; color: #1a1a1a; line-height: 1.3;">${heading}</h1>
          ${bodyHtmlLines.map((line) => `<p style="margin: 0 0 14px; font-size: 14px; color: #4b5563; line-height: 1.6;">${line}</p>`).join("")}
          <div style="margin: 28px 0 8px;">
            <a href="${ctaUrl}" style="display: inline-block; background: ${accentColor}; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 10px;">
              ${escapeHtml(ctaLabel)}
            </a>
          </div>
          <p style="margin: 24px 0 0; font-size: 12px; color: #9ca3af;">
            Werkt de knop niet? <a href="${ctaUrl}" style="color: #9ca3af; text-decoration: underline;">Klik hier om verder te gaan</a>.
          </p>
        </div>
        <div style="padding: 4px 32px 20px; font-size: 12px; color: #9ca3af;">
          REVA — vragen? Mail <a href="mailto:info@reva-app.nl" style="color: #9ca3af;">info@reva-app.nl</a>
        </div>
      </div>
    </div>
  `;
}
