-- Migration 009: RLS policies for medication tables + fix times column
-- Run this in the Supabase SQL editor.

-- ── 1. RLS op medication_logs ─────────────────────────────────────────────────

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

-- ── 3. RLS op medication_schedules ───────────────────────────────────────────

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

-- ── 4. RLS op medication_schedule_times ──────────────────────────────────────

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
