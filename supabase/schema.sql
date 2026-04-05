-- ============================================================
-- REVA Herstel Dashboard — Supabase Database Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 1. profiles ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name             text,
  email                 text,
  avatar_url            text,
  auth_provider         text,
  localstorage_migrated boolean     NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. settings ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.settings (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  birth_date                date,
  injury_date               date,
  surgery_date              date,
  injury_type               text,
  injury_type_other         text,
  injury_description        text,
  insurer_name              text,
  insurer_other             text,
  policy_number             text,
  supplementary_insurances  jsonb       NOT NULL DEFAULT '[]',
  physio_sessions_total     text,
  notifications             jsonb       NOT NULL DEFAULT '{}',
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT settings_user_id_unique UNIQUE (user_id)
);

-- ─── 3. checkins ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.checkins (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date            date        NOT NULL,
  day_score       integer     NOT NULL,
  pain_score      integer,
  mobility_score  integer,
  energy_score    integer,
  sleep_score     integer,
  mood_score      integer,
  swelling        boolean,
  note            text,
  training_done   boolean,
  medication_used boolean,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT checkins_user_date_unique UNIQUE (user_id, date)
);

-- ─── 4. appointments ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            text        NOT NULL,
  appointment_type text,
  date             date        NOT NULL,
  time             text,
  location         text,
  provider_name    text,
  preparation      text,
  bring_items      text,
  notes_before     text,
  outcome_after    text,
  follow_up_action text,
  reminder_enabled boolean     NOT NULL DEFAULT false,
  status           text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ─── 5. training_exercises ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.training_exercises (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          text        NOT NULL,
  exercise_type  text,
  description    text,
  repetitions    text,
  load_or_time   text,
  location_label text,
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ─── 6. training_schemas ─────────────────────────────────────────────────────
-- exercise_ids stored as JSONB array for simplicity (matches app data model)
CREATE TABLE IF NOT EXISTS public.training_schemas (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text        NOT NULL,
  status       text,
  duration     text,
  exercise_ids jsonb       NOT NULL DEFAULT '[]',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ─── 7. training_logs ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.training_logs (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schema_id               uuid        REFERENCES public.training_schemas(id) ON DELETE SET NULL,
  title                   text        NOT NULL,
  date                    date        NOT NULL,
  status                  text,
  note                    text,
  completed_exercise_ids  jsonb       NOT NULL DEFAULT '[]',
  duration_minutes        integer,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- ─── 8. diary_workouts ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.diary_workouts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date         date        NOT NULL,
  title        text        NOT NULL,
  schema_id    uuid        REFERENCES public.training_schemas(id) ON DELETE SET NULL,
  completed    boolean     NOT NULL DEFAULT false,
  completed_at timestamptz,
  reflection   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ─── 9. medication_logs ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.medication_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date            date        NOT NULL,
  time            text,
  medication_name text        NOT NULL,
  dosage          text,
  quantity        text,
  reason          text,
  effect          text,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── 10. medication_schedules ────────────────────────────────────────────────
-- times stored as JSONB array, matches app MedicatieSchema.tijden
CREATE TABLE IF NOT EXISTS public.medication_schedules (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_name text        NOT NULL,
  name_other      text,
  dosage          text,
  quantity        text,
  times           jsonb       NOT NULL DEFAULT '[]',
  active          boolean     NOT NULL DEFAULT true,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── 11. goals ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goals (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type    text        NOT NULL DEFAULT 'regular',
  icon         text,
  title        text        NOT NULL,
  description  text,
  target_date  date,
  completed    boolean     NOT NULL DEFAULT false,
  completed_at date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ─── 12. milestones ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.milestones (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phase           text,
  title           text        NOT NULL,
  completed       boolean     NOT NULL DEFAULT false,
  completed_at    date,
  reflection_text text,
  pain_score      integer,
  sort_order      integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── 13. dossier_documents ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dossier_documents (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text        NOT NULL,
  file_name     text,
  file_url      text,
  file_type     text,
  provider_type text,
  provider_name text,
  date          date,
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ─── 14. dossier_photo_updates ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dossier_photo_updates (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        date        NOT NULL,
  week_number integer,
  image_url   text,
  image_name  text,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── 15. dossier_contacts ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dossier_contacts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  role         text,
  organization text,
  phone        text,
  email        text,
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_exercises  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_schemas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_workouts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossier_documents   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossier_photo_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossier_contacts    ENABLE ROW LEVEL SECURITY;

-- Helper macro: own row policies (for tables using `id = auth.uid()`)
-- profiles uses id (same as auth.uid()), all others use user_id

-- profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Generic per-user RLS macro for tables with user_id column
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'settings', 'checkins', 'appointments',
    'training_exercises', 'training_schemas', 'training_logs', 'diary_workouts',
    'medication_logs', 'medication_schedules',
    'goals', 'milestones',
    'dossier_documents', 'dossier_photo_updates', 'dossier_contacts'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY "%s_select_own" ON public.%I FOR SELECT USING (auth.uid() = user_id)',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_insert_own" ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id)',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_update_own" ON public.%I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_delete_own" ON public.%I FOR DELETE USING (auth.uid() = user_id)',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ============================================================
-- Auto-create profile on signup (trigger)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, auth_provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- updated_at auto-update trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles', 'settings', 'checkins', 'appointments',
    'training_exercises', 'training_schemas', 'training_logs', 'diary_workouts',
    'medication_logs', 'medication_schedules',
    'goals', 'milestones',
    'dossier_documents', 'dossier_photo_updates', 'dossier_contacts'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_%s_updated_at ON public.%I',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE TRIGGER set_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      tbl, tbl
    );
  END LOOP;
END;
$$;
