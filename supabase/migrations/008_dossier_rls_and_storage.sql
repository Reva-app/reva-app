-- Migration 008: RLS policies for dossier tables + Supabase Storage buckets
-- Run this in the Supabase SQL editor.

-- ── 1. Dossier table RLS ──────────────────────────────────────────────────────

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'dossier_documents', 'dossier_photo_updates', 'dossier_contacts'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = tbl AND policyname = tbl || '_select_own'
    ) THEN
      EXECUTE format(
        'CREATE POLICY "%s_select_own" ON public.%I FOR SELECT USING (auth.uid() = user_id)',
        tbl, tbl
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = tbl AND policyname = tbl || '_insert_own'
    ) THEN
      EXECUTE format(
        'CREATE POLICY "%s_insert_own" ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id)',
        tbl, tbl
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = tbl AND policyname = tbl || '_update_own'
    ) THEN
      EXECUTE format(
        'CREATE POLICY "%s_update_own" ON public.%I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
        tbl, tbl
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = tbl AND policyname = tbl || '_delete_own'
    ) THEN
      EXECUTE format(
        'CREATE POLICY "%s_delete_own" ON public.%I FOR DELETE USING (auth.uid() = user_id)',
        tbl, tbl
      );
    END IF;

  END LOOP;
END;
$$;

-- ── 2. Storage buckets ────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dossier-photos',
  'dossier-photos',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/heic','image/gif']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dossier-documents',
  'dossier-documents',
  true,
  20971520,
  ARRAY['application/pdf','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg','image/png','image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- ── 3. Storage RLS policies ───────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'dossier_photos_insert_own'
  ) THEN
    CREATE POLICY "dossier_photos_insert_own"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'dossier-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'dossier_photos_select_own'
  ) THEN
    CREATE POLICY "dossier_photos_select_own"
      ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'dossier-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'dossier_photos_delete_own'
  ) THEN
    CREATE POLICY "dossier_photos_delete_own"
      ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'dossier-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'dossier_docs_insert_own'
  ) THEN
    CREATE POLICY "dossier_docs_insert_own"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'dossier-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'dossier_docs_select_own'
  ) THEN
    CREATE POLICY "dossier_docs_select_own"
      ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'dossier-documents');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'dossier_docs_delete_own'
  ) THEN
    CREATE POLICY "dossier_docs_delete_own"
      ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'dossier-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END;
$$;
