-- Structuurcontrole van de beveiliging. Draai na elke migratie in de Supabase
-- SQL Editor. Wijzigt niets. Elke regel moet status ✅ hebben.
-- Aanvulling: `npm run test:rls` test van buitenaf zonder account.

with
-- Tabellen die bewust RLS aan hebben maar géén policies (alleen service role).
zonder_policy_ok(tabel) as (values ('rate_limit_hits')),
-- Functies die anon bewust mag uitvoeren (hulpfuncties in policies).
anon_ok(naam) as (values
  ('can_access_patient'), ('can_manage_patient'), ('can_manage_patient_protocol_content'),
  ('can_manage_org_branding'), ('can_manage_org_locations'), ('can_manage_org_patients'),
  ('can_manage_org_protocols'), ('can_manage_org_staff'), ('can_view_audit_log'),
  ('can_view_org_analytics'), ('is_org_member'), ('is_platform_admin'), ('is_staff_member'),
  ('session_has_aal2')
),
tabellen as (
  select c.relname, c.relrowsecurity
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
),
definer as (
  select p.oid, p.proname, p.proconfig
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef and p.prokind = 'f'
),
checks(controle, fouten) as (
  select '1. Alle tabellen hebben RLS aan',
         (select string_agg(relname, ', ') from tabellen where not relrowsecurity)
  union all
  select '2. Geen tabel zonder policies (behalve bewuste uitzonderingen)',
         (select string_agg(t.relname, ', ') from tabellen t
          where not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.relname)
            and t.relname not in (select tabel from zonder_policy_ok))
  union all
  select '3. Alle SECURITY DEFINER-functies hebben een vast search_path',
         (select string_agg(proname, ', ') from definer
          where proconfig is null or not exists (select 1 from unnest(proconfig) c where c like 'search_path=%'))
  union all
  select '4. Geen SECURITY DEFINER-functie aanroepbaar zonder in te loggen (behalve hulpfuncties)',
         (select string_agg(proname, ', ') from definer
          where has_function_privilege('anon', oid, 'EXECUTE')
            and proname not in (select naam from anon_ok))
  union all
  select '5. Geen leespolicy die simpelweg "true" is',
         (select string_agg(tablename || '.' || policyname, ', ') from pg_policies
          where schemaname in ('public', 'storage') and cmd in ('SELECT', 'ALL') and trim(qual) = 'true')
  union all
  select '6. Geen openbare opslag-buckets',
         (select string_agg(id, ', ') from storage.buckets where public)
  union all
  select '7. Patiëntgegevens alleen voor behandelaars (geen is_org_member op patients/intakes/notities)',
         (select string_agg(tablename || '.' || policyname, ', ') from pg_policies
          where schemaname = 'public'
            and tablename in ('patients', 'patient_intakes', 'patient_staff_notes')
            and (coalesce(qual, '') || coalesce(with_check, '')) like '%is_org_member%')
  union all
  select '8. Agenda-links alleen voor medewerker zelf en Practice Owner (migratie 124)',
         (select string_agg(policyname, ', ') from pg_policies
          where schemaname = 'public' and tablename = 'staff_calendar_feeds'
            and coalesce(qual, '') like '%is_org_member%')
  union all
  select '9. REVA-bibliotheek niet leesbaar zonder lidmaatschap (migratie 126)',
         (select string_agg(tablename || '.' || policyname, ', ') from pg_policies
          where schemaname = 'public'
            and tablename in ('protocols', 'exercise_library', 'schedule_library')
            and cmd = 'SELECT'
            and coalesce(qual, '') like '%''reva''%'
            and coalesce(qual, '') not like '%is_staff_member%')
  union all
  select '10. Platform admin vereist tweestapsverificatie (migratie 120)',
         (select case when pg_get_functiondef(p.oid) like '%session_has_aal2%' then null else 'is_platform_admin zonder aal2-check' end
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'is_platform_admin')
  union all
  select '11. Gepauzeerde praktijk heeft geen toegang (migratie 128)',
         (select string_agg(p.proname, ', ')
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public'
            and p.proname in ('is_org_member', 'is_staff_member', 'can_view_clinical_data', 'can_manage_org_patients',
                              'can_manage_org_staff', 'can_manage_org_protocols', 'can_manage_org_branding',
                              'can_manage_org_locations', 'can_view_audit_log', 'can_view_org_analytics',
                              'can_manage_patient_protocol_content')
            and pg_get_functiondef(p.oid) not like '%org_is_open%')
  union all
  select '12. Interne notities niet op de organisatie-rij (migratie 131)',
         (select string_agg(column_name, ', ') from information_schema.columns
          where table_schema = 'public' and table_name = 'organizations'
            and column_name in ('support_notes', 'last_contact_at'))
)
select controle,
       case when fouten is null then '✅' else '❌' end as status,
       coalesce(fouten, '') as details
from checks
order by split_part(controle, '.', 1)::int;
