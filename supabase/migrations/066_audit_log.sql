-- 066_audit_log.sql
-- Audit-logging voor schrijfacties op patiëntgegevens (bijzondere
-- persoonsgegevens/gezondheidsdata) — een eerdere privacydoorlichting deze
-- sessie vond geen enkele audit-logging in de app. Deze migratie logt
-- aanmaken/wijzigen/verwijderen op de 12 "oudere" klinische tabellen plus
-- `patients` zelf en `patient_protocols`, via één gedeelde trigger.
--
-- Bewust NIET meegenomen (zie plan): leeslogging ("wie heeft dit dossier
-- bekeken") voor gewone praktijkmedewerkers — de eigenaar heeft al
-- bevestigd dat therapeuten elkaars patiënten mogen inzien; en de diepere
-- Protocol Engine-subtabellen (fases/criteria/mijlpalen/schema's/
-- sessielogs, migratie 049/050), die geen directe patient_id-kolom hebben —
-- kan later als uitbreiding.

create table if not exists public.audit_log (
  id               uuid primary key default gen_random_uuid(),
  table_name       text not null,
  record_id        uuid,
  patient_id       uuid,
  organization_id  uuid,
  actor_id         uuid references auth.users(id) on delete set null,
  action           text not null check (action in ('insert', 'update', 'delete', 'export')),
  old_data         jsonb,
  new_data         jsonb,
  created_at       timestamptz not null default now()
);

-- Bewust geen foreign key op patient_id/organization_id naar
-- patients/organizations: een harde FK zou het verwijderen van een patiënt
-- ook het bewijs van die verwijdering laten verdwijnen.

create index if not exists audit_log_org_created_idx on public.audit_log (organization_id, created_at desc);
create index if not exists audit_log_patient_created_idx on public.audit_log (patient_id, created_at desc);

-- ── Sessie-lokale stash voor cascaderende patiënt-deletes ──────────────────
-- Zonder dit zou organization_id NULL worden voor elke door een
-- patiënt-verwijdering gecascadeerde kindrij (checkins/appointments/etc),
-- omdat de patients-rij op het moment van de cascade al weg is binnen
-- dezelfde transactie — en de RLS-policy hieronder filtert precies op dat
-- veld, dus die logregels zouden anders onzichtbaar zijn voor de eigenaar.

create or replace function public.audit_stash_patient_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  create temp table if not exists audit_org_stash (
    patient_id uuid primary key,
    organization_id uuid
  ) on commit drop;

  insert into audit_org_stash (patient_id, organization_id)
  values (OLD.id, OLD.organization_id)
  on conflict (patient_id) do nothing;

  return OLD;
end;
$$;

create trigger audit_stash_patient_org_before_delete
  before delete on public.patients
  for each row execute function public.audit_stash_patient_org();

-- ── Generieke audit-trigger ─────────────────────────────────────────────
-- Geen exception-afvang: een AFTER-trigger draait in dezelfde transactie
-- als de write die hij logt, dus een fout hier laat ook de write terugrollen.
-- Bewust: "write lukt en is gelogd" of "write lukt niet" zijn de enige twee
-- uitkomsten, nooit "write lukt maar is stiekem niet gelogd".

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_id       uuid;
  v_patient_id      uuid;
  v_organization_id uuid;
begin
  v_record_id := case when TG_OP = 'DELETE' then OLD.id else NEW.id end;

  if TG_TABLE_NAME = 'patients' then
    -- De patiënt IS de rij: record_id = patient_id.
    v_patient_id := v_record_id;
    v_organization_id := coalesce(NEW.organization_id, OLD.organization_id);
  else
    v_patient_id := coalesce(NEW.patient_id, OLD.patient_id);
    select organization_id into v_organization_id from public.patients where id = v_patient_id;

    if v_organization_id is null and to_regclass('pg_temp.audit_org_stash') is not null then
      select organization_id into v_organization_id from pg_temp.audit_org_stash where patient_id = v_patient_id;
    end if;
  end if;

  insert into public.audit_log (table_name, record_id, patient_id, organization_id, actor_id, action, old_data, new_data)
  values (
    TG_TABLE_NAME, v_record_id, v_patient_id, v_organization_id,
    coalesce(auth.uid(), nullif(current_setting('app.audit_actor_id', true), '')::uuid),
    lower(TG_OP),
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(OLD) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(NEW) else null end
  );

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

create trigger audit_checkins              after insert or update or delete on public.checkins              for each row execute function public.audit_row_change();
create trigger audit_appointments          after insert or update or delete on public.appointments          for each row execute function public.audit_row_change();
create trigger audit_training_exercises    after insert or update or delete on public.training_exercises    for each row execute function public.audit_row_change();
create trigger audit_training_schemas      after insert or update or delete on public.training_schemas      for each row execute function public.audit_row_change();
create trigger audit_training_logs         after insert or update or delete on public.training_logs         for each row execute function public.audit_row_change();
create trigger audit_medication_logs       after insert or update or delete on public.medication_logs       for each row execute function public.audit_row_change();
create trigger audit_medication_schedules  after insert or update or delete on public.medication_schedules  for each row execute function public.audit_row_change();
create trigger audit_goals                 after insert or update or delete on public.goals                 for each row execute function public.audit_row_change();
create trigger audit_milestones            after insert or update or delete on public.milestones            for each row execute function public.audit_row_change();
create trigger audit_dossier_documents     after insert or update or delete on public.dossier_documents     for each row execute function public.audit_row_change();
create trigger audit_dossier_photo_updates after insert or update or delete on public.dossier_photo_updates for each row execute function public.audit_row_change();
create trigger audit_dossier_contacts      after insert or update or delete on public.dossier_contacts      for each row execute function public.audit_row_change();
create trigger audit_patients              after insert or update or delete on public.patients              for each row execute function public.audit_row_change();
create trigger audit_patient_protocols     after insert or update or delete on public.patient_protocols     for each row execute function public.audit_row_change();

-- ── RLS ─────────────────────────────────────────────────────────────────
-- Geen "force row level security": de trigger draait via security definer
-- als eigenaar van de functie/tabel en omzeilt RLS daardoor vanzelf. Met
-- force row level security zou dat niet meer gelden en is een aparte
-- insert-policy nodig — bewust achterwege gelaten.

alter table public.audit_log enable row level security;

create or replace function public.can_view_audit_log(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.memberships m
      join public.roles r on r.id = m.role_id
      where m.organization_id = org_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and r.key = 'organization_owner'
    );
$$;

grant execute on function public.can_view_audit_log(uuid) to authenticated;

create policy "Praktijkeigenaar leest auditlog van eigen organisatie"
  on public.audit_log for select
  using (organization_id is not null and public.can_view_audit_log(organization_id));

create policy "Platform admin leest volledige auditlog"
  on public.audit_log for select
  using (public.is_platform_admin());

-- Bewust geen insert/update/delete-policy voor enige rol — alleen de
-- trigger (via security definer) mag schrijven.

-- ── Actor-toeschrijving voor de service-role delete-routes ────────────────
-- /api/delete-patient en /api/delete-account verwijderen via de
-- service-role-client, waar auth.uid() NULL is. Zonder deze RPC's zouden de
-- twee meest ingrijpende acties in de app permanent als "onbekende
-- gebruiker" gelogd worden. set_config(...) moet in dezelfde transactie
-- gebeuren als de delete, dus gebundeld in één functie i.p.v. twee losse
-- aanroepen.

create or replace function public.delete_patient_dossier(p_patient_id uuid, p_actor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.audit_actor_id', p_actor_id::text, true);
  delete from public.patients where id = p_patient_id;
end;
$$;

grant execute on function public.delete_patient_dossier(uuid, uuid) to service_role;

create or replace function public.delete_own_patient_dossier(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.audit_actor_id', p_user_id::text, true);
  delete from public.patients where user_id = p_user_id;
end;
$$;

grant execute on function public.delete_own_patient_dossier(uuid) to service_role;

-- ── Exportlog ───────────────────────────────────────────────────────────
-- De "Exporteren"-knop bij Patiënten is puur client-side (geen
-- serveraanroep) — deze RPC geeft die bulk-PII-onttrekking alsnog een
-- logregel.

create or replace function public.log_patients_export(p_organization_id uuid, p_count int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_org_patients(p_organization_id) then
    return;
  end if;

  insert into public.audit_log (table_name, record_id, patient_id, organization_id, actor_id, action, new_data)
  values ('patients_csv_export', null, null, p_organization_id, auth.uid(), 'export',
          jsonb_build_object('exported_count', p_count));
end;
$$;

grant execute on function public.log_patients_export(uuid, int) to authenticated;
