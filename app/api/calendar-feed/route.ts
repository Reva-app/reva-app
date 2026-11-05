import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import * as ical from "node-ical";
import dns from "node:dns/promises";
import net from "node:net";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit";

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;
const MAX_ICS_BYTES = 2 * 1024 * 1024;

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
 * https naar publieke adressen: geen interne IP's of hostnamen, ook niet via
 * DNS (resolvesToPublicAddress) of via een omleiding (fetchIcsSafely).
 */
function isPrivateIPv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return a === 127 || a === 10 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  const v6 = ip.toLowerCase();
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80") || v6.startsWith("::ffff:");
}

function isUrlSafeToFetch(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return false;
  // IPv6-letterlijk (de URL-parser geeft "[::1]" terug): nooit nodig voor een agenda.
  if (host.startsWith("[")) return false;
  // De URL-parser normaliseert ook 0x7f.1, 2130706433 enz. naar a.b.c.d.
  if (net.isIPv4(host) && isPrivateIPv4(host)) return false;
  return true;
}

/** Een domeinnaam mag ook niet naar een intern adres wijzen. */
async function resolvesToPublicAddress(rawUrl: string): Promise<boolean> {
  const host = new URL(rawUrl).hostname;
  if (net.isIP(host)) return !isPrivateIp(host);
  try {
    const addresses = await dns.lookup(host, { all: true });
    return addresses.length > 0 && addresses.every((a) => !isPrivateIp(a.address));
  } catch {
    return false;
  }
}

/**
 * Haalt de iCal-link op zonder dat een omleiding of een enorm bestand de
 * afscherming hierboven omzeilt: omleidingen volgen we zelf (max 3) en elke
 * nieuwe URL moet opnieuw door isUrlSafeToFetch; het antwoord mag hooguit
 * MAX_ICS_BYTES groot zijn.
 */
async function fetchIcsSafely(startUrl: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    let url = startUrl;
    for (let hop = 0; ; hop++) {
      if (!(await resolvesToPublicAddress(url))) throw new Error("Adres niet toegestaan");
      const res = await fetch(url, {
        signal: controller.signal,
        redirect: "manual",
        headers: { Accept: "text/calendar, text/plain" },
      });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location || hop >= MAX_REDIRECTS) throw new Error("Te veel omleidingen");
        const next = new URL(location, url).toString();
        if (!isUrlSafeToFetch(next)) throw new Error("Omleiding naar een niet-toegestaan adres");
        url = next;
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const declared = Number(res.headers.get("content-length") ?? 0);
      if (declared > MAX_ICS_BYTES) throw new Error("Agenda te groot");
      if (!res.body) return "";
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_ICS_BYTES) {
          await reader.cancel();
          throw new Error("Agenda te groot");
        }
        chunks.push(value);
      }
      return new TextDecoder().decode(Buffer.concat(chunks));
    }
  } finally {
    clearTimeout(timeout);
  }
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

    const rateLimitOk = await checkRateLimit(`calendar-feed:${user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS);
    if (!rateLimitOk) return rateLimitedResponse();

    // RLS-gebonden client op het geverifieerde token — staff_calendar_feeds is
    // alleen leesbaar voor de medewerker zelf en de Practice Owner (migratie
    // 124), dus dit is meteen ook de autorisatiecheck.
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
      icsText = await fetchIcsSafely(feed.ics_url);
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
