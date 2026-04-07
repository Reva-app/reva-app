-- Migration 009: Fix medication_schedules kolommen + RLS + junction table
-- Run this in the Supabase SQL editor.

-- ── 1. Ontbrekende kolommen toevoegen aan medication_schedules ────────────────

ALTER TABLE public.medication_schedules
  ADD COLUMN IF NOT EXISTS name_other text,
  ADD COLUMN IF NOT EXISTS dosage     text,
  ADD COLUMN IF NOT EXISTS quantity   text,
  ADD COLUMN IF NOT EXISTS note       text;

-- active kolom: heeft een default nodig
ALTER TABLE public.medication_schedules
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- ── 2. medication_schedule_times aanmaken als die nog niet bestaat ─────────────

CREATE TABLE IF NOT EXISTS public.medication_schedule_times (
  id          bigserial   PRIMARY KEY,
  schedule_id uuid        NOT NULL REFERENCES public.medication_schedules(id) ON DELETE CASCADE,
  time        text        NOT NULL,
  sort_order  int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS medication_schedule_times_schedule_id_idx
  ON public.medication_schedule_times (schedule_id);

-- ── 3. RLS op medication_logs ─────────────────────────────────────────────────

ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'medication_logs' AND policyname = 'medication_logs_select_own') THEN
    CREATE POLICY "medication_logs_select_own" ON public.medication_logs FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'medication_logs' AND policyname = 'medication_logs_insert_own') THEN
    CREATE POLICY "medication_logs_insert_own" ON public.medication_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'medication_logs' AND policyname = 'medication_logs_update_own') THEN
    CREATE POLICY "medication_logs_update_own" ON public.medication_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'medication_logs' AND policyname = 'medication_logs_delete_own') THEN
    CREATE POLICY "medication_logs_delete_own" ON public.medication_logs FOR DELETE USING (auth.uid() = user_id);
  END IF;
END;
$$;

-- ── 4. RLS op medication_schedules ───────────────────────────────────────────

ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'medication_schedules' AND policyname = 'medication_schedules_select_own') THEN
    CREATE POLICY "medication_schedules_select_own" ON public.medication_schedules FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'medication_schedules' AND policyname = 'medication_schedules_insert_own') THEN
    CREATE POLICY "medication_schedules_insert_own" ON public.medication_schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'medication_schedules' AND policyname = 'medication_schedules_update_own') THEN
    CREATE POLICY "medication_schedules_update_own" ON public.medication_schedules FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'medication_schedules' AND policyname = 'medication_schedules_delete_own') THEN
    CREATE POLICY "medication_schedules_delete_own" ON public.medication_schedules FOR DELETE USING (auth.uid() = user_id);
  END IF;
END;
$$;

-- ── 5. RLS op medication_schedule_times ──────────────────────────────────────

ALTER TABLE public.medication_schedule_times ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'medication_schedule_times' AND policyname = 'Users can manage own schedule times') THEN
    CREATE POLICY "Users can manage own schedule times"
      ON public.medication_schedule_times
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.medication_schedules s
          WHERE s.id = schedule_id AND s.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.medication_schedules s
          WHERE s.id = schedule_id AND s.user_id = auth.uid()
        )
      );
  END IF;
END;
$$;
