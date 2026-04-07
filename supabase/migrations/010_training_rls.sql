-- Migration 010: Training tabellen — ontbrekende kolommen + junction table + RLS
-- Run this in the Supabase SQL editor.

-- ── 1. Ontbrekende kolommen toevoegen aan training_schemas ────────────────────

ALTER TABLE public.training_schemas
  ADD COLUMN IF NOT EXISTS status   text,
  ADD COLUMN IF NOT EXISTS duration text;

-- ── 2. Ontbrekende kolommen toevoegen aan training_logs ───────────────────────

ALTER TABLE public.training_logs
  ADD COLUMN IF NOT EXISTS status                 text,
  ADD COLUMN IF NOT EXISTS note                   text,
  ADD COLUMN IF NOT EXISTS duration_minutes       integer,
  ADD COLUMN IF NOT EXISTS completed_at           timestamptz,
  ADD COLUMN IF NOT EXISTS reflection             text;

-- completed_exercise_ids als nullable jsonb (niet NOT NULL, want kan ontbreken)
ALTER TABLE public.training_logs
  ADD COLUMN IF NOT EXISTS completed_exercise_ids jsonb;

-- completed kolom moet bestaan met default
ALTER TABLE public.training_logs
  ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;

-- ── 3. training_schema_exercises junction table ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.training_schema_exercises (
  id          bigserial PRIMARY KEY,
  schema_id   uuid      NOT NULL REFERENCES public.training_schemas(id) ON DELETE CASCADE,
  exercise_id uuid      NOT NULL REFERENCES public.training_exercises(id) ON DELETE CASCADE,
  sort_order  int       NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS training_schema_exercises_schema_id_idx
  ON public.training_schema_exercises (schema_id);

-- ── 4. RLS op training_exercises ─────────────────────────────────────────────

ALTER TABLE public.training_exercises ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_exercises' AND policyname = 'training_exercises_select_own') THEN
    CREATE POLICY "training_exercises_select_own" ON public.training_exercises FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_exercises' AND policyname = 'training_exercises_insert_own') THEN
    CREATE POLICY "training_exercises_insert_own" ON public.training_exercises FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_exercises' AND policyname = 'training_exercises_update_own') THEN
    CREATE POLICY "training_exercises_update_own" ON public.training_exercises FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_exercises' AND policyname = 'training_exercises_delete_own') THEN
    CREATE POLICY "training_exercises_delete_own" ON public.training_exercises FOR DELETE USING (auth.uid() = user_id);
  END IF;
END;
$$;

-- ── 5. RLS op training_schemas ────────────────────────────────────────────────

ALTER TABLE public.training_schemas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_schemas' AND policyname = 'training_schemas_select_own') THEN
    CREATE POLICY "training_schemas_select_own" ON public.training_schemas FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_schemas' AND policyname = 'training_schemas_insert_own') THEN
    CREATE POLICY "training_schemas_insert_own" ON public.training_schemas FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_schemas' AND policyname = 'training_schemas_update_own') THEN
    CREATE POLICY "training_schemas_update_own" ON public.training_schemas FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_schemas' AND policyname = 'training_schemas_delete_own') THEN
    CREATE POLICY "training_schemas_delete_own" ON public.training_schemas FOR DELETE USING (auth.uid() = user_id);
  END IF;
END;
$$;

-- ── 6. RLS op training_logs ───────────────────────────────────────────────────

ALTER TABLE public.training_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_logs' AND policyname = 'training_logs_select_own') THEN
    CREATE POLICY "training_logs_select_own" ON public.training_logs FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_logs' AND policyname = 'training_logs_insert_own') THEN
    CREATE POLICY "training_logs_insert_own" ON public.training_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_logs' AND policyname = 'training_logs_update_own') THEN
    CREATE POLICY "training_logs_update_own" ON public.training_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_logs' AND policyname = 'training_logs_delete_own') THEN
    CREATE POLICY "training_logs_delete_own" ON public.training_logs FOR DELETE USING (auth.uid() = user_id);
  END IF;
END;
$$;

-- ── 7. RLS op training_schema_exercises ──────────────────────────────────────

ALTER TABLE public.training_schema_exercises ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_schema_exercises' AND policyname = 'training_schema_exercises_all_own') THEN
    CREATE POLICY "training_schema_exercises_all_own"
      ON public.training_schema_exercises
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.training_schemas s
          WHERE s.id = schema_id AND s.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.training_schemas s
          WHERE s.id = schema_id AND s.user_id = auth.uid()
        )
      );
  END IF;
END;
$$;

-- ── 8. Schema cache verversen ─────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
