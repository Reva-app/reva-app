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
  setupCompleted: boolean;
}

// ─── ensureCurrentUserRows ────────────────────────────────────────────────────

/**
 * Validates the current auth session and guarantees that both a `profiles` row
 * and a `settings` row exist for the authenticated user.
 *
 * Call this at the start of every write function so that writes never fail
 * silently because bootstrap was skipped.
 */
export async function ensureCurrentUserRows(): Promise<{ userId: string | null; error: string | null }> {
  const supabase = createClient();

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    const msg = `Auth session invalid: ${authErr?.message ?? "no user"}`;
    console.error("[ensureCurrentUserRows] " + msg);
    return { userId: null, error: msg };
  }
  const uid = user.id;

  // ── profiles row ──────────────────────────────────────────────────────────
  const { data: profileRow, error: profileSelectErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", uid)
    .maybeSingle();

  if (profileSelectErr) logErr("ensureCurrentUserRows/profiles-select", profileSelectErr);

  if (!profileRow) {
    console.warn("[ensureCurrentUserRows] profiles row missing for", uid, "— creating it");
    const { error: profileInsertErr } = await supabase
      .from("profiles")
      .insert({ id: uid, email: user.email ?? "" });
    if (profileInsertErr && profileInsertErr.code !== "23505") {
      logErr("ensureCurrentUserRows/profiles-insert", profileInsertErr);
    }
  }

  // ── settings row ──────────────────────────────────────────────────────────
  const { data: settingsRow, error: settingsSelectErr } = await supabase
    .from("settings")
    .select("id")
    .eq("user_id", uid)
    .maybeSingle();

  if (settingsSelectErr) logErr("ensureCurrentUserRows/settings-select", settingsSelectErr);

  if (!settingsRow) {
    console.warn("[ensureCurrentUserRows] settings row missing for", uid, "— creating it");
    const { error: settingsInsertErr } = await supabase
      .from("settings")
      .insert({
        user_id:                  uid,
        supplementary_insurances: [],
        notifications:            {},
      });
    if (settingsInsertErr && settingsInsertErr.code !== "23505") {
      logErr("ensureCurrentUserRows/settings-insert", settingsInsertErr);
      return { userId: uid, error: `Kon settings rij niet aanmaken: ${settingsInsertErr.message}` };
    }
  }

  return { userId: uid, error: null };
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
    // Omit setup_completed and checkin_reminder_* here — let DB defaults handle them.
    // This keeps the insert working regardless of which migrations have been applied.
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

  const notifRaw = (dbSettings?.notifications ?? {}) as Record<string, unknown>;
  const notifications = dbToNotificationSettings(notifRaw, dbSettings ?? null);

  return {
    profile:        dbToProfile(dbProfile, dbSettings),
    notifications,
    migrated:       dbProfile.localstorage_migrated ?? false,
    setupCompleted: dbSettings?.setup_completed ?? false,
  };
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function upsertProfile(
  _userId: string,
  patch: Partial<Profile>
): Promise<{ error: string | null }> {
  const { userId: uid, error: ensureErr } = await ensureCurrentUserRows();
  if (!uid) return { error: ensureErr ?? "Niet ingelogd" };

  const supabase = createClient();

  // ── profiles table (naam, email, avatar) ──────────────────────────────────
  const dbPatch = profileToDb(patch);
  if (Object.keys(dbPatch).length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .update(dbPatch)
      .eq("id", uid)
      .select("id");
    if (error) {
      logErr("upsertProfile/profiles", error);
    } else if (!data || data.length === 0) {
      console.error("[upsertProfile/profiles] 0 rows updated for uid:", uid);
    }
  }

  // ── settings table (dates, injury info, insurance) ────────────────────────
  const settingsPatch = profileToSettings(patch);
  if (Object.keys(settingsPatch).length > 0) {
    console.info("[upsertProfile/settings] uid:", uid, "fields:", Object.keys(settingsPatch));
    const { data, error } = await supabase
      .from("settings")
      .update(settingsPatch)
      .eq("user_id", uid)
      .select("id");
    if (error) {
      logErr("upsertProfile/settings", error);
      return { error: error.message };
    }
    if (!data || data.length === 0) {
      const msg = "Geen settings rij geüpdatet voor deze gebruiker";
      console.error("[upsertProfile/settings] " + msg, "uid:", uid);
      return { error: msg };
    }
    console.info("[upsertProfile/settings] saved OK, rows:", data.length);
  }

  return { error: null };
}

export async function saveNotificationSettings(
  _userId: string,
  settings: NotificationSettings
): Promise<{ error: string | null }> {
  const { userId: uid, error: ensureErr } = await ensureCurrentUserRows();
  if (!uid) return { error: ensureErr ?? "Niet ingelogd" };

  const supabase = createClient();

  // Always save to the notifications JSONB column.
  const { data, error } = await supabase
    .from("settings")
    .update({ notifications: settings as unknown as Record<string, unknown> })
    .eq("user_id", uid)
    .select("id");

  if (error) {
    logErr("saveNotificationSettings/notifications", error);
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    const msg = "Geen settings rij geüpdatet voor deze gebruiker";
    console.error("[saveNotificationSettings] " + msg, "uid:", uid);
    return { error: msg };
  }

  // Best-effort update of dedicated columns (migration 003)
  // Failures are non-fatal — columns may not exist yet depending on migrations applied.
  const { error: colErr } = await supabase
    .from("settings")
    .update({
      checkin_reminder_enabled: settings.checkin,
      checkin_reminder_time:    settings.checkinTijd,
    })
    .eq("user_id", uid);
  if (colErr && colErr.code !== "42703") {
    // 42703 = undefined_column — columns not yet created, ignore silently
    logErr("saveNotificationSettings/dedicated-cols", colErr);
  }

  return { error: null };
}

export async function markMigrated(userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ localstorage_migrated: true })
    .eq("id", userId);
  if (error) logErr("markMigrated", error);
}

export async function markSetupCompleted(userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("settings")
    .update({ setup_completed: true })
    .eq("user_id", userId);
  if (error) logErr("markSetupCompleted", error);
}

/**
 * Returns whether the user has completed onboarding.
 * Used server-side (auth/callback) to determine post-login redirect.
 */
export async function getSetupCompleted(userId: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("setup_completed")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) logErr("getSetupCompleted", error);
  return data?.setup_completed ?? false;
}
