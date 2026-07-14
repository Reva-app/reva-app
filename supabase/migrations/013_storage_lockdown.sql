-- Migration 013: Storage buckets privé maken + eigenaarschap afdwingen bij lezen
-- Run this in the Supabase SQL editor.
--
-- Waarom: de buckets 'dossier-photos' en 'dossier-documents' stonden op
-- public = true. Bestanden in een public bucket worden geserveerd via
-- /storage/v1/object/public/<bucket>/<pad> zonder enige authenticatiecheck —
-- RLS op storage.objects is dan niet van toepassing op die publieke URL.
-- Daarnaast checkten de bestaande SELECT-policies alleen de bucket_id, niet
-- het pad, dus elke ingelogde gebruiker kon via de Storage API ook bestanden
-- van andere gebruikers opvragen.
--
-- Deze migratie:
--   1. Zet beide buckets op private.
--   2. Vervangt de SELECT-policies zodat een gebruiker alleen bestanden in
--      zijn eigen map (userId/...) kan lezen.
-- De app is aangepast om voortaan signed URLs te gebruiken in plaats van
-- publieke URLs (zie lib/services/storageService.ts).

-- ── 1. Buckets privé maken ────────────────────────────────────────────────────

UPDATE storage.buckets
SET public = false
WHERE id IN ('dossier-photos', 'dossier-documents');

-- ── 2. SELECT-policies vervangen door eigenaarschap-check ────────────────────

DROP POLICY IF EXISTS "dossier_photos_select_own" ON storage.objects;
CREATE POLICY "dossier_photos_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'dossier-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "dossier_docs_select_own" ON storage.objects;
CREATE POLICY "dossier_docs_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'dossier-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- INSERT- en DELETE-policies uit migratie 008 checkten het pad al correct
-- en hoeven niet aangepast te worden.
