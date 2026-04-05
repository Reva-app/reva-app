import { createClient } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import {
  dbToProfile, dbToNotificationSettings,
  profileToDb, profileToSettings,
} from "@/lib/db/mappers";
import type { Profile, NotificationSettings } from "@/lib/data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function logErr(
  fn: string,
  err: { message?: string; code?: string; details?: string; hint?: string } | null
) {
  if (!err) return;
  console.error(
    `[${fn}] Supabase error — message: "${err.message}" | code: ${err.code} | details: ${err.details} | hint: ${err.hint}`
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProfileWithSettings {
  profile: Profile;
  notifications: NotificationSettings;
  migrated: boolean;
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

/**
 * Ensures a `profiles` row and a `settings` row exist for the authenticated user.
 * Safe to call on every login — fully idempotent.
 *
 * - New users: inserts both rows using Auth metadata (name, avatar, email).
 * - Returning users: backfills `full_name` / `avatar_url` / `email` only when
 *   the DB column is currently empty and the Auth metadata has a value.
 * - Never resets `localstorage_migrated` on existing rows.
 */
export async function ensureUserProfileAndSettings(user: User): Promise<void> {
  const supabase = createClient();

  const meta    = user.user_metadata ?? {};
  const appMeta = user.app_metadata  ?? {};

  const fullName    = (meta.full_name as string | undefined)
    || (meta.name   as string | undefined)
    || "";
  const avatarUrl   = (meta.avatar_url as string | undefined)
    || (meta.picture as string | undefined)
    || "";
  const email       = user.email ?? "";
  const authProvider = (appMeta.provider as string | undefined) ?? "email";

  // ── Profile row ──────────────────────────────────────────────────────────

  const { data: existingProfile, error: selectErr } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, email")
    .eq("id", user.id)
    .maybeSingle();

  if (selectErr) {
    logErr("ensureUserProfileAndSettings/profiles-select", selectErr);
  }

  if (!existingProfile) {
    // Row doesn't exist yet (DB trigger may have missed it in some edge cases)
    const { error: insertErr } = await supabase
      .from("profiles")
      .insert({
        id:                    user.id,
        email,
        full_name:             fullName || null,
        avatar_url:            avatarUrl || null,
        auth_provider:         authProvider,
        localstorage_migrated: false,
      });
    if (insertErr && insertErr.code !== "23505") {
      // 23505 = unique_violation — another request beat us to it, safe to ignore
      logErr("ensureUserProfileAndSettings/profiles-insert", insertErr);
    }
  } else {
    // Backfill empty columns from Auth metadata (never overwrite user-set values)
    const patch: Record<string, string> = {};
    if (!existingProfile.full_name  && fullName)   patch.full_name  = fullName;
    if (!existingProfile.avatar_url && avatarUrl)  patch.avatar_url = avatarUrl;
    if (!existingProfile.email      && email)      patch.email      = email;

    if (Object.keys(patch).length > 0) {
      const { error: updateErr } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", user.id);
      if (updateErr) logErr("ensureUserProfileAndSettings/profiles-update", updateErr);
    }
  }

  // ── Settings row ─────────────────────────────────────────────────────────

  const { data: existingSettings, error: settingsSelectErr } = await supabase
    .from("settings")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (settingsSelectErr) {
    logErr("ensureUserProfileAndSettings/settings-select", settingsSelectErr);
  }

  if (!existingSettings) {
    const { error: settingsInsertErr } = await supabase
      .from("settings")
      .insert({
        user_id:                  user.id,
        supplementary_insurances: [],
        notifications:            {},
      });
    if (settingsInsertErr && settingsInsertErr.code !== "23505") {
      logErr("ensureUserProfileAndSettings/settings-insert", settingsInsertErr);
    }
  }
}

// ─── Load ─────────────────────────────────────────────────────────────────────

export async function loadProfileAndSettings(userId: string): Promise<ProfileWithSettings | null> {
  const supabase = createClient();

  const [profileRes, settingsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("settings").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  if (profileRes.error) {
    if (profileRes.error.code !== "PGRST116") {
      logErr("loadProfileAndSettings/profiles", profileRes.error);
    }
    return null;
  }

  const dbProfile  = profileRes.data;
  const dbSettings = settingsRes.data ?? null;

  if (!dbProfile) return null;

  const notifications = dbSettings?.notifications
    ? dbToNotificationSettings(dbSettings.notifications as Record<string, unknown>)
    : {
        checkin: true, afspraken: true, medicatie: true,
        training: false, foto: false, mijlpalen: true, checkinTijd: "20:00",
      };

  return {
    profile:    dbToProfile(dbProfile, dbSettings),
    notifications,
    migrated:   dbProfile.localstorage_migrated ?? false,
  };
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function upsertProfile(userId: string, patch: Partial<Profile>): Promise<void> {
  const supabase = createClient();
  const dbPatch = profileToDb(patch);

  if (Object.keys(dbPatch).length > 0) {
    const { error } = await supabase
      .from("profiles")
      .update(dbPatch)
      .eq("id", userId);
    if (error) logErr("upsertProfile/profiles", error);
  }

  const settingsPatch = profileToSettings(patch);
  if (Object.keys(settingsPatch).length > 0) {
    const { error } = await supabase
      .from("settings")
      .upsert({ user_id: userId, ...settingsPatch }, { onConflict: "user_id" });
    if (error) logErr("upsertProfile/settings", error);
  }
}

export async function saveNotificationSettings(
  userId: string,
  settings: NotificationSettings
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("settings")
    .upsert(
      { user_id: userId, notifications: settings as unknown as Record<string, unknown> },
      { onConflict: "user_id" }
    );
  if (error) logErr("saveNotificationSettings", error);
}

export async function markMigrated(userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ localstorage_migrated: true })
    .eq("id", userId);
  if (error) logErr("markMigrated", error);
}
