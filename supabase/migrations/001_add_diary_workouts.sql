-- Migration: create diary_workouts table if it does not exist yet.
-- Run this in the Supabase SQL Editor if the table is missing.

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

-- Row Level Security
ALTER TABLE public.diary_workouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diary_workouts_select" ON public.diary_workouts;
DROP POLICY IF EXISTS "diary_workouts_insert" ON public.diary_workouts;
DROP POLICY IF EXISTS "diary_workouts_update" ON public.diary_workouts;
DROP POLICY IF EXISTS "diary_workouts_delete" ON public.diary_workouts;

CREATE POLICY "diary_workouts_select" ON public.diary_workouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "diary_workouts_insert" ON public.diary_workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "diary_workouts_update" ON public.diary_workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "diary_workouts_delete" ON public.diary_workouts FOR DELETE USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER set_updated_at_diary_workouts
  BEFORE UPDATE ON public.diary_workouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
