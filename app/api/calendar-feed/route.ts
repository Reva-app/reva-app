import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import * as ical from "node-ical";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit";

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
const FETCH_TIMEOUT_MS = 8000;

interface Body {
  membershipId: string;
  rangeStart: string; // "YYYY-MM-DD"
  rangeEnd: string; // "YYYY-MM-DD"
}

interface BusyBlock {
  startsAt: string;
  endsAt: string;
  summary: string;
}

/**
 * Basale SSRF-afscherming: de ics_url is door een ingelogde org-lid zelf
 * opgeslagen (geen anonieme aanvaller-invoer), maar de server haalt 'm
 * hierna zelf op — een kwaadwillend lid zou een interne URL kunnen
 * opslaan om de server tegen eigen infrastructuur te laten praten. Alleen
 * https, geen IP-literals, geen localhost/link-local.
 */
function isUrlSafeToFetch(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) return false;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    const [a, b] = host.split(".").map(Number);
    if (a === 127 || a === 10 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
      return false;
    }
  }
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) return false;
  return true;
}

function textValue(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "val" in v) return String((v as { val: unknown }).val ?? "");
  return String(v);
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const authClient = createSupabaseClient(supabaseUrl, anonKey);
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

    const rateLimitOk = await checkRateLimit(authClient, `calendar-feed:${user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS);
    if (!rateLimitOk) return rateLimitedResponse();

    // RLS-gebonden client op het geverifieerde token — de select/update op
    // staff_calendar_feeds is al is_org_member/can_manage_org_staff-gated
    // (migratie 118), dus dit is meteen ook de autorisatiecheck.
    const supabase = createSupabaseClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const body = (await request.json()) as Body;
    if (!body.membershipId || !body.rangeStart || !body.rangeEnd) {
      return NextResponse.json({ error: "Ontbrekende velden" }, { status: 400 });
    }

    const { data: feed, error: feedError } = await supabase
      .from("staff_calendar_feeds")
      .select("ics_url")
      .eq("membership_id", body.membershipId)
      .maybeSingle();
    if (feedError) {
      console.error("[calendar-feed] Supabase error:", feedError.message);
      return NextResponse.json({ error: "Ophalen van de agenda-koppeling is niet gelukt." }, { status: 500 });
    }
    if (!feed) {
      return NextResponse.json({ error: "Geen agenda gekoppeld." }, { status: 404 });
    }
    if (!isUrlSafeToFetch(feed.ics_url)) {
      return NextResponse.json({ error: "Deze iCal-link is niet toegestaan." }, { status: 400 });
    }

    async function markSyncResult(syncError: string | null) {
      await supabase
        .from("staff_calendar_feeds")
        .update({ last_synced_at: new Date().toISOString(), last_sync_error: syncError })
        .eq("membership_id", body.membershipId);
    }

    let icsText: string;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(feed.ics_url, { signal: controller.signal, headers: { Accept: "text/calendar, text/plain" } });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      icsText = await res.text();
    } catch (fetchErr) {
      const message = fetchErr instanceof Error && fetchErr.name === "AbortError"
        ? "Ophalen van de agenda duurde te lang."
        : "De agenda-link kon niet opgehaald worden.";
      await markSyncResult(message);
      return NextResponse.json({ blocks: [], error: message });
    }

    let parsed: ical.CalendarResponse;
    try {
      parsed = await ical.async.parseICS(icsText);
    } catch {
      const message = "De agenda-link bevat geen geldig iCal-bestand.";
      await markSyncResult(message);
      return NextResponse.json({ blocks: [], error: message });
    }

    const rangeFrom = new Date(`${body.rangeStart}T00:00:00`);
    const rangeTo = new Date(`${body.rangeEnd}T23:59:59`);
    const blocks: BusyBlock[] = [];

    for (const component of Object.values(parsed)) {
      if (!component || typeof component !== "object" || component.type !== "VEVENT") continue;
      const event = component as ical.VEvent;
      if (event.datetype === "date") continue; // hele-dag-event, geen "druk"-tijdvak

      if (event.rrule) {
        const instances = ical.expandRecurringEvent(event, { from: rangeFrom, to: rangeTo });
        for (const instance of instances) {
          if (instance.isFullDay) continue;
          blocks.push({ startsAt: instance.start.toISOString(), endsAt: instance.end.toISOString(), summary: textValue(instance.summary) });
        }
      } else if (event.start && event.end && event.start < rangeTo && event.end > rangeFrom) {
        blocks.push({ startsAt: event.start.toISOString(), endsAt: event.end.toISOString(), summary: textValue(event.summary) });
      }
    }

    blocks.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    await markSyncResult(null);
    return NextResponse.json({ blocks, error: null });
  } catch (err) {
    console.error("[calendar-feed] Onverwachte fout:", err);
    return NextResponse.json({ error: "Er ging iets mis." }, { status: 500 });
  }
}
