-- 056_exercise_library_tags.sql
--
-- Voegt de `tags`-kolom toe aan exercise_library. De portal-UI
-- (protocolService.ts / oefeningen/page.tsx) selecteert, filtert en beheert
-- deze kolom al, maar de kolom zelf ontbrak nog in het schema.

alter table public.exercise_library
  add column if not exists tags text[] not null default '{}';

create index if not exists exercise_library_tags_idx on public.exercise_library using gin (tags);
