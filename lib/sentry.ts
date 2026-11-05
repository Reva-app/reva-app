import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

/**
 * Gedeelde Sentry-instellingen voor browser, server en edge.
 *
 * Privacy (AVG): REVA verwerkt gezondheidsgegevens, dus naar Sentry gaat
 * alleen technische foutinformatie. Geen IP-adressen, cookies, headers,
 * request-bodies, querystrings (Supabase-filters bevatten soms e-mailadressen)
 * of console-uitvoer; e-mailadressen in foutteksten worden vervangen.
 * Session Replay staat bewust uit. Data staat in de EU (ingest.de.sentry.io).
 */

// Een DSN is geen geheim — hij staat sowieso in de browserbundel.
export const SENTRY_DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://805affe3de01ac08660fb2dba0ed6e10@o4512375718346752.ingest.de.sentry.io/4512377745440848";

// Alleen productie-builds melden (lokaal ontwikkelen vervuilt het dashboard niet).
export const SENTRY_ENABLED = process.env.NODE_ENV === "production";

export const SENTRY_ENVIRONMENT = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? "production";

export const SENTRY_TRACES_SAMPLE_RATE = 0.1;

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function scrubText(text: string): string {
  return text.replace(EMAIL_RE, "[e-mail]");
}

function stripQuery(url: string): string {
  const i = url.search(/[?#]/);
  return i === -1 ? url : url.slice(0, i);
}

export function scrubEvent(event: ErrorEvent): ErrorEvent | null {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
    delete event.request.query_string;
    if (event.request.url) event.request.url = stripQuery(event.request.url);
  }
  if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
  if (event.message) event.message = scrubText(event.message);
  for (const ex of event.exception?.values ?? []) {
    if (ex.value) ex.value = scrubText(ex.value);
  }
  return event;
}

export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb | null {
  // Console-regels bevatten soms Supabase-foutdetails met ingevoerde waarden.
  if (crumb.category === "console") return null;
  if (typeof crumb.data?.url === "string") crumb.data.url = stripQuery(crumb.data.url);
  if (typeof crumb.data?.to === "string") crumb.data.to = stripQuery(crumb.data.to);
  if (typeof crumb.data?.from === "string") crumb.data.from = stripQuery(crumb.data.from);
  if (crumb.message) crumb.message = scrubText(crumb.message);
  return crumb;
}

export const sharedSentryOptions = {
  dsn: SENTRY_DSN,
  enabled: SENTRY_ENABLED,
  environment: SENTRY_ENVIRONMENT,
  sendDefaultPii: false,
  tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
  beforeSend: scrubEvent,
  beforeBreadcrumb: scrubBreadcrumb,
};
