-- 127: inzage-logging (NEN 7513). De auditlog legde tot nu toe alleen vast wie
-- iets aanmaakte, wijzigde, verwijderde of exporteerde. NEN 7513 vraagt ook:
-- wie heeft welk dossier ingezien, en wanneer.
--
-- Alle data wordt client-side via RLS gelezen, dus een SELECT-trigger bestaat
-- niet. In plaats daarvan meldt de portal het openen van een patiëntdossier
-- via log_patient_view(). De functie controleert zelf of de aanroeper het
-- dossier echt mag zien (anders kan niemand de log vervuilen met dossiers
-- van een andere praktijk) en voegt hooguit één regel per medewerker, per
-- dossier, per 10 minuten toe — tabbladen wisselen of verversen geeft dus
-- geen tientallen regels. Een patiënt die zijn eigen gegevens bekijkt wordt
-- niet gelogd.
--
-- De regels verschijnen in het activiteitenlog van de Practice Owner als
-- "Bekeken · Patiëntdossier". Ze zijn net als de rest van de auditlog niet
-- te wijzigen of te verwijderen (geen UPDATE/DELETE-policies).

alter table public.audit_log drop constraint if exists audit_log_action_check;
alter table public.audit_log
  add constraint audit_log_action_check
  check (action in ('insert', 'update', 'delete', 'export', 'view'));

create index if not exists audit_log_view_dedupe_idx
  on public.audit_log (actor_id, patient_id, created_at desc)
  where action = 'view';

create or replace function public.log_patient_view(p_patient_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_org_id uuid;
  v_patient_user uuid;
begin
  if v_uid is null then
    return;
  end if;

  select organization_id, user_id into v_org_id, v_patient_user
  from public.patients
  where id = p_patient_id;

  if v_org_id is null or v_patient_user = v_uid then
    return;
  end if;

  if not public.can_access_patient(p_patient_id) then
    return;
  end if;

  if exists (
    select 1 from public.audit_log
    where action = 'view'
      and actor_id = v_uid
      and patient_id = p_patient_id
      and created_at > now() - interval '10 minutes'
  ) then
    return;
  end if;

  insert into public.audit_log (table_name, record_id, patient_id, organization_id, actor_id, action)
  values ('patients', p_patient_id, p_patient_id, v_org_id, v_uid, 'view');
end;
$$;

revoke execute on function public.log_patient_view(uuid) from public, anon;
grant execute on function public.log_patient_view(uuid) to authenticated;
