/**
 * pushService.ts
 *
 * Beheert push notificaties via @capacitor/push-notifications.
 *
 * Flow:
 *  1. initPushNotifications(userId) aanroepen zodra de gebruiker ingelogd is.
 *  2. Vraagt toestemming aan.
 *  3. Registreert het FCM/APNs token in Supabase (push_tokens tabel).
 *  4. Toont binnenkomende notificaties als in-app toast (foreground).
 *  5. Handelt tap op notificatie af (navigatie).
 */

import { createClient } from "@/lib/supabaseClient";

type CleanupFn = () => void;

let cleanupRef: CleanupFn | null = null;

/**
 * Initialiseer push notificaties voor de ingelogde gebruiker.
 * Veilig om meerdere keren aan te roepen — verwijdert eerst de oude listeners.
 */
export async function initPushNotifications(userId: string): Promise<void> {
  // Ruim eventuele vorige listeners op
  cleanupRef?.();
  cleanupRef = null;

  if (typeof window === "undefined") return;

  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return;

  const { PushNotifications } = await import("@capacitor/push-notifications");

  // ── Vraag toestemming ──────────────────────────────────────────────────────
  const permResult = await PushNotifications.requestPermissions();
  if (permResult.receive !== "granted") {
    console.info("[pushService] toestemming geweigerd door gebruiker");
    return;
  }

  // ── Registreer bij FCM/APNs ────────────────────────────────────────────────
  await PushNotifications.register();

  // ── Listeners ─────────────────────────────────────────────────────────────
  const regListener = await PushNotifications.addListener(
    "registration",
    async ({ value: token }) => {
      console.info("[pushService] token ontvangen:", token.slice(0, 20) + "…");
      await savePushToken(userId, token, Capacitor.getPlatform() as "android" | "ios");
    }
  );

  const errListener = await PushNotifications.addListener(
    "registrationError",
    ({ error }) => {
      console.error("[pushService] registratiefout:", error);
    }
  );

  // Notificatie ontvangen terwijl app open is → toon als in-app melding
  const fgListener = await PushNotifications.addListener(
    "pushNotificationReceived",
    (notification) => {
      console.info("[pushService] notificatie ontvangen (foreground):", notification.title);
      // Gooi een custom DOM-event zodat de app er op kan reageren
      window.dispatchEvent(
        new CustomEvent("reva:notification", { detail: notification })
      );
    }
  );

  // Gebruiker tikt op notificatie → navigeer naar de juiste pagina
  const tapListener = await PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (action) => {
      const data = action.notification.data as Record<string, string> | undefined;
      const route = data?.route ?? "/";
      console.info("[pushService] notificatie tap, navigeer naar:", route);
      // Gebruik history API — werkt ook vanuit background
      if (typeof window !== "undefined") {
        window.location.href = route;
      }
    }
  );

  cleanupRef = () => {
    regListener.remove();
    errListener.remove();
    fgListener.remove();
    tapListener.remove();
  };
}

/**
 * Verwijder push-listeners (bijv. bij uitloggen).
 */
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
    console.error("[pushService] token opslaan mislukt:", error.message);
  } else {
    console.info("[pushService] token opgeslagen voor user:", userId.slice(0, 8));
  }
}

/**
 * Verwijder het token van dit device (bij uitloggen).
 */
export async function removePushToken(userId: string): Promise<void> {
  if (typeof window === "undefined") return;

  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return;

  const { PushNotifications } = await import("@capacitor/push-notifications");
  const supabase = createClient();

  try {
    // Haal huidig token op om het specifiek te verwijderen
    await PushNotifications.register();
    // We verwijderen gewoon alle tokens van deze user op dit device
    // (simpeler dan het token apart op te halen)
    await supabase
      .from("push_tokens")
      .delete()
      .eq("user_id", userId)
      .eq("platform", Capacitor.getPlatform());
  } catch (e) {
    console.warn("[pushService] token verwijderen mislukt:", e);
  }
}
