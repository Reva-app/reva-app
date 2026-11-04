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

import { EMAIL_REPLY_TO, type EmailBrand, type EmailContent } from "./layout.ts";

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
