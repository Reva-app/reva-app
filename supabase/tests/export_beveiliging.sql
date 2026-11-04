-- Exporteert de beveiligingsinstellingen zoals ze LIVE in de database staan:
--   1. per tabel: staat Row Level Security aan?
--   2. alle policies (public + storage)
--   3. overzicht SECURITY DEFINER-functies: wie mag ze aanroepen, search_path vast?
--   4. de volledige broncode van die functies
--
-- Gebruik: plak in de Supabase SQL Editor → Run → klik op de ene cel in het
-- resultaat → kopieer de inhoud → sla op als supabase/snapshots/beveiliging-live.sql.
-- (Niet in de chat plakken: die kapt af na 50.000 tekens.) Wijzigt niets.

with rls as (
  select 1 as groep, c.relname as sleutel,
         format('-- RLS %-40s %s', c.relname, case when c.relrowsecurity then 'aan' else '⚠️ UIT' end) as regel
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
),
pol as (
  select 2, schemaname || '.' || tablename || '.' || policyname,
         format(E'create policy %I on %I.%I as %s for %s to %s%s%s;',
           policyname, schemaname, tablename, permissive, cmd, array_to_string(roles, ', '),
           case when qual is not null then E'\n  using (' || qual || ')' else '' end,
           case when with_check is not null then E'\n  with check (' || with_check || ')' else '' end)
  from pg_policies
  where schemaname in ('public', 'storage')
),
fn_overzicht as (
  select 3, p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         format('-- FN %-55s anon: %-4s authenticated: %-4s search_path: %s',
           p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
           case when has_function_privilege('anon', p.oid, 'EXECUTE') then 'JA' else 'nee' end,
           case when has_function_privilege('authenticated', p.oid, 'EXECUTE') then 'JA' else 'nee' end,
           coalesce(array_to_string(p.proconfig, ' '), '⚠️ NIET VAST'))
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef and p.prokind = 'f'
),
fn as (
  select 4, p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         format(E'-- uitvoeren door anon: %s, authenticated: %s\n%s',
           case when has_function_privilege('anon', p.oid, 'EXECUTE') then 'JA' else 'nee' end,
           case when has_function_privilege('authenticated', p.oid, 'EXECUTE') then 'JA' else 'nee' end,
           pg_get_functiondef(p.oid))
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef and p.prokind = 'f'
)
select string_agg(regel, E'\n\n' order by groep, sleutel) as beveiliging_live
from (
  select * from rls
  union all select * from pol
  union all select * from fn_overzicht
  union all select * from fn
) alles;
