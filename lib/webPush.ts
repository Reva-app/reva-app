/**
 * Pushmeldingen in de webapp (Web Push + service worker, public/sw.js).
 *
 * - Android/desktop: werkt in de browser én als app op het beginscherm.
 * - iPhone/iPad: alleen als REVA op het beginscherm staat (iOS 16.4+).
 * De native Capacitor-app gebruikt lib/services/pushService.ts (FCM).
 */
import { createClient } from "@/lib/supabaseClient";
import { apiUrl } from "@/lib/apiBase";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type PushState =
  | "unsupported"     // browser kan het niet (of geen sleutel geconfigureerd)
  | "needs-install"   // iOS: eerst op het beginscherm zetten
  | "denied"          // gebruiker heeft meldingen geblokkeerd
  | "off"             // kan, maar staat uit
  | "on";             // aangemeld op dit apparaat

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function supported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!VAPID_PUBLIC_KEY;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  return existing ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

/** In de native app (Capacitor) lopen meldingen via FCM, niet via Web Push. */
function isNativeApp(): boolean {
  return typeof window !== "undefined" && !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
}

export async function getPushState(): Promise<PushState> {
  if (typeof window === "undefined" || isNativeApp()) return "unsupported";
  if (isIos() && !isStandalone()) return "needs-install";
  if (!supported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Toestemming vragen en dit apparaat aanmelden. Moet vanuit een klik worden aangeroepen. */
export async function enablePush(): Promise<{ state: PushState; error: string | null }> {
  if (isIos() && !isStandalone()) return { state: "needs-install", error: null };
  if (!supported()) return { state: "unsupported", error: "Je browser ondersteunt geen pushmeldingen." };
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { state: permission === "denied" ? "denied" : "off", error: null };
  try {
    const reg = await registration();
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription())
      ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }));
    const json = sub.toJSON();
    const supabase = createClient();
    const { error } = await supabase.rpc("save_push_subscription", {
      p_endpoint: sub.endpoint,
      p_p256dh: json.keys?.p256dh ?? "",
      p_auth: json.keys?.auth ?? "",
      p_user_agent: navigator.userAgent,
    });
    if (error) return { state: "off", error: "Opslaan van de aanmelding is niet gelukt." };
    return { state: "on", error: null };
  } catch (e) {
    console.error("[webPush] aanmelden:", e);
    return { state: "off", error: "Aanmelden voor pushmeldingen is niet gelukt." };
  }
}

/** Dit apparaat afmelden (bv. bij uitzetten of uitloggen). */
export async function disablePush(): Promise<void> {
  if (!supported()) return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  const supabase = createClient();
  await supabase.from("web_push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe().catch(() => {});
}

/** Testmelding naar alle aangemelde apparaten van de ingelogde gebruiker. */
export async function sendTestPush(opts: { portal?: boolean } = {}): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: "Niet ingelogd." };
  const res = await fetch(apiUrl("/api/push/test"), { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ portal: !!opts.portal }) });
  const json = await res.json().catch(() => ({}));
  return { error: res.ok ? null : json.error ?? "Versturen is niet gelukt." };
}
