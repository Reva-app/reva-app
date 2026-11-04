// ⚠️ GEGENEREERD door `npm run email:build` — niet hier wijzigen.
// Bron: lib/email/layout.ts + lib/email/messages.ts

/**
 * REVA e-mail-layout — de enige bron voor de opmaak van álle e-mails:
 *   - uitnodigingen en feedback (app/api/*, via Resend)
 *   - herinneringen (supabase/functions/send-checkin-reminder, via Resend)
 *   - Supabase-auth-mails: bevestigen, wachtwoord, e-mail wijzigen
 *     (supabase/templates/*.html, via de Hostnet-SMTP in het Supabase-dashboard)
 *
 * Bewust ZONDER imports: `npm run email:build` kopieert dit bestand 1-op-1
 * naar de Edge Function (Deno kan niet uit lib/ importeren) en genereert er
 * de Supabase-templates mee. Wijzig dus alleen hier, en draai daarna dat script.
 *
 * Opmaak met tabellen i.p.v. divs: Outlook voor Windows rendert met de
 * Word-engine en negeert o.a. max-width, border-radius en padding op divs.
 * Alle tekst wordt hier ge-escaped — aanroepers geven platte tekst door.
 */

export const REVA_ORANGE = "#e8632a";
export const EMAIL_FROM_ADDRESS = "noreply@reva-app.nl";
export const EMAIL_REPLY_TO = "info@reva-app.nl";
const LOGO_URL = "https://dashboard.reva-app.nl/email/reva-logo.png";

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const COLOR_BG = "#f8f7f4";
const COLOR_BORDER = "#ece9e3";
const COLOR_HEADING = "#1a1a1a";
const COLOR_BODY = "#4b5563";
const COLOR_MUTED = "#6b7280";

export type EmailBrand =
  | { kind: "reva" }
  | { kind: "practice"; name: string; color: string | null };

/** Een stukje lopende tekst; `{ bold }` wordt vetgedrukt. */
export type EmailInline = string | { bold: string };
export type EmailParagraph = string | EmailInline[];

export interface EmailContent {
  brand: EmailBrand;
  /** Onderwerpregel; ook de <title> van de HTML. */
  subject: string;
  /** Voorbeeldregel in de inbox, onder de onderwerpregel (±90 tekens). */
  preheader: string;
  heading: string;
  paragraphs: EmailParagraph[];
  button?: { label: string; url: string };
  /** Kleine regels onder de knop, bv. geldigheid of "niet verwacht?". */
  notes?: string[];
  /** Label/waarde-rijen — voor interne mails (feedback). */
  details?: { label: string; value: string }[];
  /** Vrij tekstblok met behoud van regeleinden — voor interne mails. */
  message?: string;
  /** Waarom de ontvanger dit krijgt, met optionele link (bv. naar meldingen). */
  footerReason?: { text: string; linkLabel?: string; linkUrl?: string };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isHexColor(value: string | null | undefined): value is string {
  return !!value && /^#[0-9a-fA-F]{6}$/.test(value);
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function darken(hex: string, factor: number): string {
  return "#" + [1, 3, 5]
    .map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * factor).toString(16).padStart(2, "0"))
    .join("");
}

/** De huisstijlkleur van het merk, of REVA-oranje als die ontbreekt. */
export function brandAccent(brand: EmailBrand): string {
  return brand.kind === "practice" && isHexColor(brand.color) ? brand.color : REVA_ORANGE;
}

/**
 * Knopkleuren met leesbare tekst (WCAG AA, 4,5:1) voor élke huisstijlkleur:
 * witte tekst als dat kan; donkere tekst op heel lichte kleuren (geel,
 * lichtblauw); anders de kleur stapsgewijs donkerder tot wit leesbaar is.
 */
export function buttonColors(accent: string): { background: string; text: string } {
  const base = isHexColor(accent) ? accent : REVA_ORANGE;
  if (contrast("#ffffff", base) >= 4.5) return { background: base, text: "#ffffff" };
  if (contrast(COLOR_HEADING, base) >= 7) return { background: base, text: COLOR_HEADING };
  let background = base;
  for (let i = 0; i < 20 && contrast("#ffffff", background) < 4.5; i++) {
    background = darken(background, 0.92);
  }
  return { background, text: "#ffffff" };
}

/** Afzendernaam: "REVA", of "Fysio Cura Plaza via REVA" bij praktijkmails. */
export function senderName(brand: EmailBrand): string {
  if (brand.kind === "reva") return "REVA";
  const clean = brand.name.replace(/["<>\r\n,;]/g, "").trim().slice(0, 60);
  return clean ? `${clean} via REVA` : "REVA";
}

/** Complete From-header voor Resend. */
export function emailFrom(brand: EmailBrand): string {
  return `${senderName(brand)} <${EMAIL_FROM_ADDRESS}>`;
}

function inlineHtml(paragraph: EmailParagraph): string {
  const parts = typeof paragraph === "string" ? [paragraph] : paragraph;
  return parts
    .map((p) => (typeof p === "string" ? escapeHtml(p) : `<strong style="color:${COLOR_HEADING};font-weight:600;">${escapeHtml(p.bold)}</strong>`))
    .join("");
}

function inlineText(paragraph: EmailParagraph): string {
  const parts = typeof paragraph === "string" ? [paragraph] : paragraph;
  return parts.map((p) => (typeof p === "string" ? p : p.bold)).join("");
}

function brandName(brand: EmailBrand): string {
  return brand.kind === "reva" ? "REVA" : brand.name;
}

// ─── HTML ───────────────────────────────────────────────────────────────────

function headerHtml(brand: EmailBrand): string {
  if (brand.kind === "practice") {
    return `<span style="font-family:${FONT};font-size:17px;font-weight:700;color:${COLOR_HEADING};letter-spacing:-0.01em;">${escapeHtml(brand.name)}</span>`;
  }
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="vertical-align:middle;padding-right:10px;"><img src="${LOGO_URL}" width="32" height="32" alt="REVA" style="display:block;border:0;"></td>
      <td style="vertical-align:middle;font-family:${FONT};font-size:18px;font-weight:700;color:${COLOR_HEADING};letter-spacing:-0.01em;">REVA</td>
    </tr></table>`;
}

function footerHtml(content: EmailContent): string {
  const lines: string[] = [];
  if (content.footerReason) {
    const { text, linkLabel, linkUrl } = content.footerReason;
    const link = linkLabel && linkUrl
      ? ` <a href="${escapeHtml(linkUrl)}" style="color:${COLOR_MUTED};text-decoration:underline;">${escapeHtml(linkLabel)}</a>`
      : "";
    lines.push(`${escapeHtml(text)}${link}`);
  }
  lines.push(`Vragen? Mail naar <a href="mailto:${EMAIL_REPLY_TO}" style="color:${COLOR_MUTED};text-decoration:underline;">${EMAIL_REPLY_TO}</a>.`);
  lines.push(
    content.brand.kind === "practice"
      ? `Verstuurd namens ${escapeHtml(content.brand.name)} via REVA.`
      : "REVA &middot; Grip op je herstel"
  );
  return lines
    .map((l) => `<p style="margin:0 0 6px;font-family:${FONT};font-size:12px;line-height:1.6;color:${COLOR_MUTED};">${l}</p>`)
    .join("");
}

export function renderEmailHtml(content: EmailContent): string {
  const accent = brandAccent(content.brand);
  const button = buttonColors(accent);

  const paragraphs = content.paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:${COLOR_BODY};">${inlineHtml(p)}</p>`)
    .join("");

  const details = content.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;border:1px solid ${COLOR_BORDER};border-radius:10px;border-collapse:separate;">
        ${content.details.map((d, i) => `<tr>
          <td style="padding:10px 14px;${i > 0 ? `border-top:1px solid ${COLOR_BORDER};` : ""}width:96px;vertical-align:top;font-family:${FONT};font-size:12px;font-weight:600;color:${COLOR_MUTED};text-transform:uppercase;letter-spacing:0.03em;">${escapeHtml(d.label)}</td>
          <td style="padding:10px 14px;${i > 0 ? `border-top:1px solid ${COLOR_BORDER};` : ""}vertical-align:top;font-family:${FONT};font-size:14px;color:${COLOR_HEADING};">${escapeHtml(d.value)}</td>
        </tr>`).join("")}
      </table>`
    : "";

  const message = content.message
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;"><tr>
        <td style="background:${COLOR_BG};border-radius:10px;padding:16px 18px;font-family:${FONT};font-size:14px;line-height:1.6;color:#374151;">${escapeHtml(content.message).replace(/\r?\n/g, "<br>")}</td>
      </tr></table>`
    : "";

  const buttonHtml = content.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;"><tr>
        <td align="center" bgcolor="${button.background}" style="border-radius:10px;background:${button.background};">
          <a href="${escapeHtml(content.button.url)}" target="_blank" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:15px;font-weight:600;line-height:20px;color:${button.text};text-decoration:none;border-radius:10px;">${escapeHtml(content.button.label)}</a>
        </td>
      </tr></table>`
    : "";

  const notes = (content.notes ?? [])
    .map((n) => `<p style="margin:12px 0 0;font-family:${FONT};font-size:13px;line-height:1.55;color:${COLOR_MUTED};">${escapeHtml(n)}</p>`)
    .join("");

  // Onzichtbare opvulling na de preheader, zodat de inbox-preview niet
  // aanvult met tekst uit de mail zelf.
  const preheaderFill = "&#8203;&nbsp;".repeat(60);

  return `<!DOCTYPE html>
<html lang="nl" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(content.subject)}</title>
<style>
  @media (max-width: 480px) {
    .reva-card { padding: 28px 22px 26px !important; }
    .reva-outer { padding: 24px 12px !important; }
  }
</style>
<!--[if mso]><style>table, td, p, a, span { font-family: Arial, sans-serif !important; }</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:${COLOR_BG};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(content.preheader)}${preheaderFill}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR_BG};">
  <tr>
    <td align="center" class="reva-outer" style="padding:40px 16px;">
      <!--[if mso]><table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
        <tr><td style="padding:0 4px 18px;">${headerHtml(content.brand)}</td></tr>
        <tr>
          <td style="background:#ffffff;border:1px solid ${COLOR_BORDER};border-radius:16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td height="4" style="height:4px;line-height:4px;font-size:0;background:${button.background};border-radius:16px 16px 0 0;">&nbsp;</td></tr>
              <tr>
                <td class="reva-card" style="padding:36px 36px 32px;">
                  <h1 style="margin:0 0 18px;font-family:${FONT};font-size:24px;line-height:1.3;font-weight:700;color:${COLOR_HEADING};letter-spacing:-0.01em;">${escapeHtml(content.heading)}</h1>
                  ${paragraphs}${details}${message}${buttonHtml}${notes}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:22px 8px 0;">${footerHtml(content)}</td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ─── Platte tekst ───────────────────────────────────────────────────────────
// Een mail zonder text/plain-deel wordt door spamfilters extra wantrouwend
// behandeld; bovendien leest niet iedereen HTML-mail.

export function renderEmailText(content: EmailContent): string {
  const lines: string[] = [brandName(content.brand), "", content.heading, ""];
  for (const p of content.paragraphs) lines.push(inlineText(p), "");
  if (content.details?.length) {
    for (const d of content.details) lines.push(`${d.label}: ${d.value}`);
    lines.push("");
  }
  if (content.message) lines.push(content.message, "");
  if (content.button) lines.push(`${content.button.label}: ${content.button.url}`, "");
  for (const n of content.notes ?? []) lines.push(n);
  if (content.notes?.length) lines.push("");
  lines.push("—");
  if (content.footerReason) {
    const { text, linkLabel, linkUrl } = content.footerReason;
    lines.push(linkUrl ? `${text} ${linkLabel ?? ""}: ${linkUrl}`.trim() : text);
  }
  lines.push(`Vragen? Mail naar ${EMAIL_REPLY_TO}.`);
  lines.push(content.brand.kind === "practice" ? `Verstuurd namens ${content.brand.name} via REVA.` : "REVA · Grip op je herstel");
  return lines.join("\n");
}

export function renderEmail(content: EmailContent): { subject: string; html: string; text: string } {
  return { subject: content.subject, html: renderEmailHtml(content), text: renderEmailText(content) };
}

/**
 * Alle e-mailteksten van REVA op één plek — zie layout.ts voor de opmaak.
 *
 * Wordt net als layout.ts door `npm run email:build` gekopieerd naar de
 * Edge Function en gebruikt voor de Supabase-templates; importeer daarom
 * alleen ./layout.ts (met extensie, zodat Deno het ook kan lezen).
 *
 * Tekstprincipes: je-vorm, kort, rustig. Nooit medische inhoud (diagnose,
 * medicijnnaam, afspraaktitel, intake): e-mail is niet end-to-end
 * versleuteld en wordt doorgestuurd en gedeeld. Details staan in de app.
 */


export interface PracticeInfo {
  name: string;
  color: string | null;
}

function practiceBrand(practice: PracticeInfo): EmailBrand {
  return { kind: "practice", name: practice.name, color: practice.color };
}

/** "Fysiotherapeut" → "fysiotherapeut", voor gebruik in een lopende zin. */
function roleInSentence(roleName: string | null): string {
  return (roleName ?? "medewerker").toLowerCase();
}

const NOT_EXPECTED = "Verwachtte je deze e-mail niet? Dan kun je hem negeren.";

// ─── Uitnodigingen (app/api/send-invite) ──────────────────────────────────────

export function patientInviteEmail(p: { practice: PracticeInfo; firstName: string; url: string }): EmailContent {
  return {
    brand: practiceBrand(p.practice),
    subject: `${p.practice.name} heeft je hersteldashboard klaargezet`,
    preheader: "Activeer je account en zie je afspraken, oefeningen en voortgang op één plek.",
    heading: p.firstName ? `Welkom, ${p.firstName}` : "Welkom bij je hersteldashboard",
    paragraphs: [
      [{ bold: p.practice.name }, " begeleidt je herstel met REVA. Je hebt nu een eigen hersteldashboard met je afspraken, oefeningen en voortgang op één plek."],
      "Kies een wachtwoord om je account te activeren. Dat kost je minder dan een minuut.",
    ],
    button: { label: "Account activeren", url: p.url },
    notes: [
      `Deze link is persoonlijk en beperkt geldig. Werkt hij niet meer? Vraag ${p.practice.name} dan om een nieuwe uitnodiging.`,
    ],
    footerReason: { text: `Je ontvangt deze e-mail omdat ${p.practice.name} een dossier voor je heeft aangemaakt in REVA.` },
  };
}

export function staffInviteEmail(p: { practice: PracticeInfo; firstName: string; roleName: string | null; url: string }): EmailContent {
  return {
    brand: practiceBrand(p.practice),
    subject: `${p.practice.name} nodigt je uit voor REVA`,
    preheader: "Activeer je account, kies een wachtwoord en stel tweestapsverificatie in.",
    heading: p.firstName ? `${p.firstName}, je bent uitgenodigd` : "Je bent uitgenodigd",
    paragraphs: [
      [{ bold: p.practice.name }, ` nodigt je uit om als ${roleInSentence(p.roleName)} mee te werken in REVA, het platform waarmee de praktijk het herstel van patiënten begeleidt.`],
      "Na het activeren kies je een wachtwoord en stel je tweestapsverificatie in met een authenticator-app. Zo blijven de gegevens van patiënten goed beschermd.",
    ],
    button: { label: "Uitnodiging accepteren", url: p.url },
    notes: [
      `Deze link is persoonlijk en beperkt geldig. Werkt hij niet meer? Vraag de beheerder van ${p.practice.name} dan om een nieuwe uitnodiging.`,
      NOT_EXPECTED,
    ],
  };
}

export function ownerInviteEmail(p: { organizationName: string; firstName: string; url: string }): EmailContent {
  return {
    brand: { kind: "reva" },
    subject: `Welkom bij REVA: richt ${p.organizationName} in`,
    preheader: "Activeer je account en zet je praktijk in een paar stappen klaar.",
    heading: p.firstName ? `Welkom bij REVA, ${p.firstName}` : "Welkom bij REVA",
    paragraphs: [
      ["Je bent uitgenodigd om ", { bold: p.organizationName }, " te beheren in REVA, het platform waarmee je praktijk grip houdt op elke fase van het hersteltraject van patiënten."],
      "Na het activeren kies je een wachtwoord en stel je tweestapsverificatie in. Daarna nodig je je team uit, richt je je locaties in en zet je REVA in de huisstijl van je praktijk.",
    ],
    button: { label: "Aan de slag", url: p.url },
    notes: [
      `Deze link is persoonlijk en beperkt geldig. Werkt hij niet meer? Mail naar ${EMAIL_REPLY_TO}, dan sturen we je een nieuwe.`,
    ],
  };
}

/** Bestaand REVA-account dat direct als medewerker aan een praktijk is gekoppeld. */
export function staffAccessGrantedEmail(p: { practice: PracticeInfo; firstName: string; roleName: string | null; url: string }): EmailContent {
  return {
    brand: practiceBrand(p.practice),
    subject: `Je hebt nu toegang tot ${p.practice.name} in REVA`,
    preheader: "Kies een wachtwoord en log in om direct aan de slag te gaan.",
    heading: p.firstName ? `${p.firstName}, je hebt nu toegang` : "Je hebt nu toegang",
    paragraphs: [
      [{ bold: p.practice.name }, ` heeft je als ${roleInSentence(p.roleName)} toegevoegd in REVA.`],
      "Kies via de knop hieronder een wachtwoord en log in. Heb je nog geen tweestapsverificatie, dan stel je die daarna in.",
    ],
    button: { label: "Wachtwoord kiezen", url: p.url },
    notes: [`Deze link is persoonlijk en beperkt geldig.`, NOT_EXPECTED],
  };
}

/** Nieuwe activatielink voor een medewerker of eigenaar die nog niet klaar was. */
export function activationReminderEmail(p: { brand: EmailBrand; organizationName: string; firstName: string; url: string }): EmailContent {
  return {
    brand: p.brand,
    subject: "Je nieuwe link voor REVA",
    preheader: "Rond het activeren van je account af met deze nieuwe link.",
    heading: p.firstName ? `${p.firstName}, hier is je nieuwe link` : "Hier is je nieuwe link",
    paragraphs: [
      ["Je account voor ", { bold: p.organizationName }, " is nog niet helemaal geactiveerd. Met de knop hieronder kies je een wachtwoord en ga je verder waar je gebleven was."],
    ],
    button: { label: "Account activeren", url: p.url },
    notes: ["Deze link is persoonlijk en beperkt geldig.", NOT_EXPECTED],
  };
}

// ─── Herinneringen (supabase/functions/send-checkin-reminder) ─────────────────

function reminderFooter(siteUrl: string): EmailContent["footerReason"] {
  return {
    text: "Je ontvangt deze herinnering omdat je hem hebt aangezet in REVA.",
    linkLabel: "Meldingen aanpassen",
    linkUrl: `${siteUrl}/instellingen`,
  };
}

export function checkinReminderEmail(p: { brand: EmailBrand; siteUrl: string }): EmailContent {
  return {
    brand: p.brand,
    subject: "Hoe gaat het vandaag?",
    preheader: "Je dagelijkse check-in kost je een minuut.",
    heading: "Tijd voor je check-in",
    paragraphs: [
      p.brand.kind === "practice"
        ? "Hoe voel je je vandaag? Je check-in kost je een minuut en laat je behandelaar zien hoe je herstel verloopt."
        : "Hoe voel je je vandaag? Je check-in kost je een minuut en geeft je een helder beeld van je herstel.",
    ],
    button: { label: "Check-in invullen", url: `${p.siteUrl}/check-in` },
    footerReason: reminderFooter(p.siteUrl),
  };
}

export function medicationReminderEmail(p: { brand: EmailBrand; siteUrl: string }): EmailContent {
  return {
    brand: p.brand,
    subject: "Herinnering: je medicatie",
    preheader: "Je hebt nu een medicatiemoment ingepland.",
    heading: "Tijd voor je medicatie",
    paragraphs: ["Je hebt nu een medicatiemoment ingepland. In REVA zie je wat je inneemt en leg je de inname direct vast."],
    button: { label: "Naar medicatie", url: `${p.siteUrl}/medicatie` },
    footerReason: reminderFooter(p.siteUrl),
  };
}

export function photoReminderEmail(p: { brand: EmailBrand; siteUrl: string }): EmailContent {
  return {
    brand: p.brand,
    subject: "Tijd voor je wekelijkse foto",
    preheader: "Eén foto per week laat zien hoe ver je al bent gekomen.",
    heading: "Leg je voortgang vast",
    paragraphs: ["Eén foto per week maakt zichtbaar hoe ver je al bent gekomen. Zo zie je straks precies hoe je herstel is verlopen."],
    button: { label: "Foto toevoegen", url: `${p.siteUrl}/dossier?tab=foto-updates` },
    footerReason: reminderFooter(p.siteUrl),
  };
}

export function appointmentReminderEmail(p: { brand: EmailBrand; siteUrl: string; day: "vandaag" | "morgen"; time: string | null }): EmailContent {
  const when = p.time ? `${p.day} om ${p.time}` : p.day;
  return {
    brand: p.brand,
    subject: `Herinnering: je afspraak ${p.day}`,
    preheader: `Je hebt ${when} een afspraak.`,
    heading: "Je afspraak komt eraan",
    paragraphs: [
      `Je hebt ${when} een afspraak.`,
      "In REVA zie je waar het is en wat je mee moet nemen.",
    ],
    button: { label: "Bekijk je afspraak", url: `${p.siteUrl}/afspraken` },
    footerReason: reminderFooter(p.siteUrl),
  };
}

// ─── Intern (app/api/feedback) ────────────────────────────────────────────────

export function feedbackNotificationEmail(p: { categorie: string; onderwerp: string; naam: string; email: string; bericht: string }): EmailContent {
  const details = [
    p.categorie && { label: "Categorie", value: p.categorie },
    p.naam && { label: "Van", value: p.naam },
    p.email && { label: "E-mail", value: p.email },
  ].filter((d): d is { label: string; value: string } => !!d);
  return {
    brand: { kind: "reva" },
    subject: `[Feedback] ${p.categorie ? `${p.categorie}: ` : ""}${p.onderwerp}`,
    preheader: p.bericht.slice(0, 90),
    heading: p.onderwerp,
    paragraphs: [],
    details,
    message: p.bericht,
    footerReason: { text: "Verstuurd via het feedbackformulier in REVA. Beantwoord deze mail om direct te reageren." },
  };
}

// ─── Supabase-auth (supabase/templates, via `npm run email:build`) ───────────
// {{ .SiteURL }}, {{ .TokenHash }}, {{ .Email }} en {{ .NewEmail }} zijn
// Supabase-templatevariabelen. De links wijzen naar onze eigen /auth/verify
// i.p.v. {{ .ConfirmationURL }}: mailscanners openen links in e-mails
// automatisch en zouden de eenmalige token anders al verbruiken
// (zie app/auth/verify/page.tsx).

function verifyUrl(type: string, next: string): string {
  return `{{ .SiteURL }}/auth/verify?token_hash={{ .TokenHash }}&type=${type}&next=${next}`;
}

export function authConfirmSignupEmail(): EmailContent {
  return {
    brand: { kind: "reva" },
    subject: "Bevestig je e-mailadres voor REVA",
    preheader: "Nog één stap: bevestig je e-mailadres en je account is klaar.",
    heading: "Bevestig je e-mailadres",
    paragraphs: ["Welkom bij REVA. Bevestig je e-mailadres om je account te activeren."],
    button: { label: "E-mailadres bevestigen", url: verifyUrl("email", "/") },
    notes: ["Heb je geen account aangemaakt bij REVA? Dan kun je deze e-mail negeren."],
  };
}

export function authResetPasswordEmail(): EmailContent {
  return {
    brand: { kind: "reva" },
    subject: "Stel een nieuw wachtwoord in voor REVA",
    preheader: "Je hebt een nieuw wachtwoord aangevraagd.",
    heading: "Nieuw wachtwoord instellen",
    paragraphs: [
      "Je hebt een nieuw wachtwoord aangevraagd voor je REVA-account ({{ .Email }}).",
      "Kies via de knop hieronder een nieuw wachtwoord.",
    ],
    button: { label: "Nieuw wachtwoord kiezen", url: verifyUrl("recovery", "/auth/reset-password") },
    notes: [
      "Deze link is beperkt geldig en werkt één keer.",
      "Heb je dit niet aangevraagd? Dan hoef je niets te doen; je wachtwoord blijft hetzelfde.",
    ],
  };
}

export function authChangeEmailEmail(): EmailContent {
  return {
    brand: { kind: "reva" },
    subject: "Bevestig de wijziging van je e-mailadres",
    preheader: "Bevestig dat je je e-mailadres voor REVA wilt wijzigen.",
    heading: "Bevestig je nieuwe e-mailadres",
    paragraphs: [
      "Je hebt gevraagd om het e-mailadres van je REVA-account te wijzigen van {{ .Email }} naar {{ .NewEmail }}.",
      "Bevestig de wijziging via de knop hieronder.",
    ],
    button: { label: "Wijziging bevestigen", url: verifyUrl("email_change", "/instellingen") },
    notes: [`Heb je dit niet aangevraagd? Wijzig dan direct je wachtwoord en mail naar ${EMAIL_REPLY_TO}.`],
  };
}
