/**
 * pushService.ts
 *
 * Beheert push notificaties via @capacitor/push-notifications.
 *
 * Flow:
 *  1. initPushNotifications(userId) aanroepen zodra de gebruiker ingelogd is.
 *  2. Maakt een Android notification channel aan (vereist op Android 8+).
 *  3. Vraagt toestemming aan.
 *  4. Registreert het FCM/APNs token in Supabase (push_tokens tabel).
 *  5. Toont binnenkomende notificaties als in-app toast (foreground).
 *  6. Handelt tap op notificatie af (navigatie).
 */

import { createClient } from "@/lib/supabaseClient";

// Channel-ID moet overeenkomen met wat de Edge Function verstuurt
export const PUSH_CHANNEL_ID = "reva_default";

type CleanupFn = () => void;
let cleanupRef: CleanupFn | null = null;

export async function initPushNotifications(userId: string): Promise<void> {
  cleanupRef?.();
  cleanupRef = null;

  if (typeof window === "undefined") return;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) {
      console.info("[pushService] geen native platform — push overgeslagen");
      return;
    }

    const { PushNotifications } = await import("@capacitor/push-notifications");

    // ── Android: maak notification channel aan (vereist op Android 8+) ──────
    // Als de channel al bestaat heeft createChannel geen effect.
    if (Capacitor.getPlatform() === "android") {
      try {
        await PushNotifications.createChannel({
          id:          PUSH_CHANNEL_ID,
          name:        "REVA meldingen",
          description: "Herinneringen voor check-ins, medicatie en afspraken",
          importance:  4, // IMPORTANCE_HIGH — toont heads-up banner
          sound:       "default",
          vibration:   true,
          visibility:  1, // VISIBILITY_PUBLIC
        });
        console.info("[pushService] channel aangemaakt:", PUSH_CHANNEL_ID);
      } catch (chErr) {
        console.warn("[pushService] channel aanmaken mislukt (niet fataal):", chErr);
      }
    }

    // ── Check huidige permissie-status ───────────────────────────────────────
    const current = await PushNotifications.checkPermissions();
    console.info("[pushService] huidige permissie:", current.receive);

    // ── Listeners vóór register() — voorkomt gemiste tokens ─────────────────
    const regListener = await PushNotifications.addListener(
      "registration",
      async ({ value: token }) => {
        console.info("[pushService] ✅ FCM token ontvangen:", token.slice(0, 25) + "…");
        await savePushToken(userId, token, Capacitor.getPlatform() as "android" | "ios");
      }
    );

    const errListener = await PushNotifications.addListener(
      "registrationError",
      ({ error }) => {
        console.warn("[pushService] ❌ registratiefout:", JSON.stringify(error));
      }
    );

    const fgListener = await PushNotifications.addListener(
      "pushNotificationReceived",
      (notification) => {
        console.info("[pushService] 📩 notificatie ontvangen (foreground):", notification.title);
        window.dispatchEvent(new CustomEvent("reva:notification", { detail: notification }));
      }
    );

    const tapListener = await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action) => {
        const data  = action.notification.data as Record<string, string> | undefined;
        const route = data?.route ?? "/";
        console.info("[pushService] 👆 notificatie tap → navigeer naar:", route);
        if (typeof window !== "undefined") window.location.href = route;
      }
    );

    cleanupRef = () => {
      regListener.remove();
      errListener.remove();
      fgListener.remove();
      tapListener.remove();
    };

    // ── Vraag toestemming ────────────────────────────────────────────────────
    if (current.receive === "denied") {
      console.warn("[pushService] ⛔ notificaties geweigerd in telefooninstellingen");
      console.warn("[pushService] → Ga naar Instellingen > Apps > REVA > Meldingen");
      cleanupRef();
      cleanupRef = null;
      return;
    }

    const permResult = current.receive === "granted"
      ? current
      : await PushNotifications.requestPermissions();

    console.info("[pushService] permissie na request:", permResult.receive);

    if (permResult.receive !== "granted") {
      console.info("[pushService] toestemming niet verleend — push uitgeschakeld");
      cleanupRef();
      cleanupRef = null;
      return;
    }

    // ── Registreer bij FCM ───────────────────────────────────────────────────
    console.info("[pushService] registreren bij FCM…");
    await PushNotifications.register();

  } catch (err) {
    console.warn("[pushService] initialisatie mislukt (niet fataal):", err);
    cleanupRef?.();
    cleanupRef = null;
  }
}

export function cleanupPushNotifications(): void {
  cleanupRef?.();
  cleanupRef = null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function savePushToken(
  userId: string,
  token: string,
  platform: "android" | "ios"
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("push_tokens")
    .upsert(
      { user_id: userId, token, platform, updated_at: new Date().toISOString() },
      { onConflict: "user_id,token" }
    );

  if (error) {
    console.error("[pushService] ❌ token opslaan mislukt:", error.message);
    console.error("[pushService]   code:", error.code, "hint:", error.hint);
  } else {
    console.info("[pushService] ✅ token opgeslagen voor user:", userId.slice(0, 8));
  }
}

export async function removePushToken(userId: string): Promise<void> {
  if (typeof window === "undefined") return;

  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return;

  const supabase = createClient();

  try {
    await supabase
      .from("push_tokens")
      .delete()
      .eq("user_id", userId)
      .eq("platform", Capacitor.getPlatform());
  } catch (e) {
    console.warn("[pushService] token verwijderen mislukt:", e);
  }
}
