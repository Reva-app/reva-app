-- 054_schedule_library.sql
-- Protocol Engine, vervolg: trainingsschema's worden herbruikbare
-- bibliotheek-items, net als oefeningen (exercise_library) — in plaats van
-- rechtstreeks eigendom van precies één fase. Een fase koppelt voortaan een
-- schema uit de bibliotheek via een aparte link-tabel, met een eigen
-- frequentie-override per koppeling (dezelfde "Krachtopbouw" kan in fase 2
-- op 3× en in fase 4 op 5× per week staan).
--
-- De patiëntkopie-tabellen (migratie 049) blijven ongewijzigd — dat zijn al
-- gedenormaliseerde, bevroren kopieën; alleen assign_protocol_to_patient()
-- moet weten hoe het de nieuwe structuur moet uitlezen.
--
-- Daarnaast in deze migratie: een weekindicatie op fases, en de
-- blessuretype-koppeling patiënt ↔ instellingen (los van het protocol).

-- ── 1. schedule_library (zelfde scope-opzet als protocols/exercise_library)

create table if not exists public.schedule_library (
  id                  uuid primary key default gen_random_uuid(),
  scope               text not null check (scope in ('reva', 'organization')),
  organization_id     uuid references public.organizations(id) on delete cascade,
  source_schedule_id  uuid references public.schedule_library(id) on delete set null,
  title               text not null,
  description         text,
  archived            boolean not null default false,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint schedule_library_scope_org_check check (
    (scope = 'reva' and organization_id is null) or
    (scope = 'organization' and organization_id is not null)
  )
);

create index if not exists schedule_library_organization_id_idx on public.schedule_library(organization_id);
create index if not exists schedule_library_scope_idx on public.schedule_library(scope);

create trigger set_schedule_library_updated_at
  before update on public.schedule_library
  for each row execute function public.set_updated_at();

alter table public.schedule_library enable row level security;

create policy "Organisatielid leest schema's (REVA + eigen organisatie)"
  on public.schedule_library for select
  using (scope = 'reva' or public.is_org_member(organization_id));

create policy "Platform admin beheert REVA-schema's"
  on public.schedule_library for all
  using (scope = 'reva' and public.is_platform_admin())
  with check (scope = 'reva' and public.is_platform_admin());

create policy "Bevoegd organisatielid beheert eigen schema's"
  on public.schedule_library for all
  using (scope = 'organization' and public.can_manage_org_protocols(organization_id))
  with check (scope = 'organization' and public.can_manage_org_protocols(organization_id));

-- ── 2. schedule_library_exercises (junction + voorschrift, was eerst
--    protocol_phase_schedule_exercises) ──────────────────────────────────

create table if not exists public.schedule_library_exercises (
  id                          bigserial primary key,
  schedule_id                 uuid not null references public.schedule_library(id) on delete cascade,
  exercise_id                 uuid not null references public.exercise_library(id) on delete restrict,
  sort_order                  integer not null default 0,
  prescribed_sets             integer,
  prescribed_reps             integer,
  prescribed_duration_seconds integer,
  prescribed_load_text        text,
  prescription_note           text,
  created_at                  timestamptz not null default now()
);

create index if not exists schedule_library_exercises_schedule_id_idx on public.schedule_library_exercises(schedule_id);

alter table public.schedule_library_exercises enable row level security;

create policy "Organisatielid leest schema-oefeningen"
  on public.schedule_library_exercises for select
  using (exists (
    select 1 from public.schedule_library sl
    where sl.id = schedule_id and (sl.scope = 'reva' or public.is_org_member(sl.organization_id))
  ));

create policy "Platform admin beheert schema-oefeningen van REVA-schema's"
  on public.schedule_library_exercises for all
  using (exists (select 1 from public.schedule_library sl where sl.id = schedule_id and sl.scope = 'reva' and public.is_platform_admin()))
  with check (exists (select 1 from public.schedule_library sl where sl.id = schedule_id and sl.scope = 'reva' and public.is_platform_admin()));

create policy "Bevoegd organisatielid beheert schema-oefeningen van eigen schema's"
  on public.schedule_library_exercises for all
  using (exists (select 1 from public.schedule_library sl where sl.id = schedule_id and sl.scope = 'organization' and public.can_manage_org_protocols(sl.organization_id)))
  with check (exists (select 1 from public.schedule_library sl where sl.id = schedule_id and sl.scope = 'organization' and public.can_manage_org_protocols(sl.organization_id)));

-- ── 3. protocol_phase_schedule_links (koppelt een bibliotheekschema aan een
--    specifieke fase, met een eigen frequentie-override) ──────────────────
-- schedule_id is ON DELETE RESTRICT — een schema dat in een fase gebruikt
-- wordt mag niet stilzwijgend verdwijnen, zelfde reden als exercise_id op
-- schedule_library_exercises.

create table if not exists public.protocol_phase_schedule_links (
  id                  uuid primary key default gen_random_uuid(),
  phase_id            uuid not null references public.protocol_phases(id) on delete cascade,
  schedule_id         uuid not null references public.schedule_library(id) on delete restrict,
  frequency_per_week  integer not null default 3 check (frequency_per_week between 1 and 21),
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists protocol_phase_schedule_links_phase_id_idx on public.protocol_phase_schedule_links(phase_id);
create index if not exists protocol_phase_schedule_links_schedule_id_idx on public.protocol_phase_schedule_links(schedule_id);

create trigger set_protocol_phase_schedule_links_updated_at
  before update on public.protocol_phase_schedule_links
  for each row execute function public.set_updated_at();

alter table public.protocol_phase_schedule_links enable row level security;

create policy "Organisatielid leest schema-koppelingen van toegankelijke fases"
  on public.protocol_phase_schedule_links for select
  using (exists (
    select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id
    where ph.id = phase_id and (p.scope = 'reva' or public.is_org_member(p.organization_id))
  ));

create policy "Platform admin beheert schema-koppelingen van REVA-protocollen"
  on public.protocol_phase_schedule_links for all
  using (exists (select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id where ph.id = phase_id and p.scope = 'reva' and public.is_platform_admin()))
  with check (exists (select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id where ph.id = phase_id and p.scope = 'reva' and public.is_platform_admin()));

create policy "Bevoegd organisatielid beheert schema-koppelingen van eigen protocollen"
  on public.protocol_phase_schedule_links for all
  using (exists (select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id where ph.id = phase_id and p.scope = 'organization' and public.can_manage_org_protocols(p.organization_id)))
  with check (exists (select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id where ph.id = phase_id and p.scope = 'organization' and public.can_manage_org_protocols(p.organization_id)));

-- ── 4. Datamigratie: bestaande protocol_phase_schedules → schedule_library
--    + protocol_phase_schedule_links, protocol_phase_schedule_exercises →
--    schedule_library_exercises. Idempotentie-guard: alleen migreren als de
--    oude tabel nog bestaat (voorkomt dubbele migratie bij herhaald draaien).

do $$
declare
  v_old_schedule record;
  v_new_schedule_id uuid;
  v_protocol_scope text;
  v_protocol_org_id uuid;
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'protocol_phase_schedules') then
    for v_old_schedule in
      select s.*, p.scope as protocol_scope, p.organization_id as protocol_org_id
      from public.protocol_phase_schedules s
      join public.protocol_phases ph on ph.id = s.phase_id
      join public.protocols p on p.id = ph.protocol_id
    loop
      insert into public.schedule_library (scope, organization_id, title)
      values (v_old_schedule.protocol_scope, v_old_schedule.protocol_org_id, v_old_schedule.title)
      returning id into v_new_schedule_id;

      insert into public.schedule_library_exercises
        (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text, prescription_note)
      select v_new_schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text, prescription_note
      from public.protocol_phase_schedule_exercises
      where schedule_id = v_old_schedule.id;

      insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
      values (v_old_schedule.phase_id, v_new_schedule_id, v_old_schedule.frequency_per_week, v_old_schedule.sort_order);
    end loop;
  end if;
end $$;

-- ── 5. Oude tabellen opruimen ────────────────────────────────────────────
-- patient_protocol_schedules.source_schedule_id verwees naar de oude
-- protocol_phase_schedules — die kolom is puur lineage or nooit voor v1 in
-- gebruik (geen echte patiënttoewijzingen bestaan nog), dus repointen naar
-- schedule_library is veilig; bestaande waarden (indien aanwezig) worden
-- null (de rijen waar ze naar verwezen bestaan zo dadelijk niet meer).

alter table public.patient_protocol_schedules
  drop constraint if exists patient_protocol_schedules_source_schedule_id_fkey;

update public.patient_protocol_schedules set source_schedule_id = null;

drop table if exists public.protocol_phase_schedule_exercises;
drop table if exists public.protocol_phase_schedules;

alter table public.patient_protocol_schedules
  add constraint patient_protocol_schedules_source_schedule_id_fkey
    foreign key (source_schedule_id) references public.schedule_library(id) on delete set null;

-- ── 6. assign_protocol_to_patient(): schema-gedeelte leest voortaan via de
--    link-tabel + schedule_library i.p.v. rechtstreeks via phase_id ───────

create or replace function public.assign_protocol_to_patient(p_patient_id uuid, p_protocol_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_protocol_scope text;
  v_protocol_org_id uuid;
  v_protocol_name text;
  v_protocol_injury_category text;
  v_patient_protocol_id uuid;
  v_phase record;
  v_new_phase_id uuid;
  v_is_first_phase boolean := true;
  v_link record;
  v_new_schedule_id uuid;
  v_schedule_exercise record;
  v_criterion record;
  v_milestone record;
  v_education record;
begin
  select organization_id into v_org_id from public.patients where id = p_patient_id;
  if v_org_id is null then
    raise exception 'Patiënt niet gevonden';
  end if;

  if not public.can_manage_org_patients(v_org_id) then
    raise exception 'Geen toegang';
  end if;

  select scope, organization_id, name, injury_category
    into v_protocol_scope, v_protocol_org_id, v_protocol_name, v_protocol_injury_category
  from public.protocols
  where id = p_protocol_id and not archived;

  if v_protocol_name is null then
    raise exception 'Protocol niet gevonden of gearchiveerd';
  end if;
  if not (v_protocol_scope = 'reva' or v_protocol_org_id = v_org_id) then
    raise exception 'Protocol hoort niet bij deze organisatie';
  end if;

  update public.patient_protocols
  set status = 'archived', updated_at = now()
  where patient_id = p_patient_id and status in ('active', 'paused');

  insert into public.patient_protocols
    (patient_id, source_protocol_id, name, injury_category, status, assigned_by, assigned_at)
  values
    (p_patient_id, p_protocol_id, v_protocol_name, v_protocol_injury_category, 'active', auth.uid(), now())
  returning id into v_patient_protocol_id;

  for v_phase in
    select * from public.protocol_phases where protocol_id = p_protocol_id order by sort_order asc
  loop
    insert into public.patient_protocol_phases
      (patient_protocol_id, source_phase_id, sort_order, name, description, therapist_notes, status, started_at, forbidden_activities)
    values
      (v_patient_protocol_id, v_phase.id, v_phase.sort_order, v_phase.name, v_phase.description, v_phase.therapist_notes,
       case when v_is_first_phase then 'active' else 'not_started' end,
       case when v_is_first_phase then now() else null end,
       v_phase.forbidden_activities)
    returning id into v_new_phase_id;

    v_is_first_phase := false;

    for v_criterion in
      select * from public.protocol_phase_criteria where phase_id = v_phase.id order by sort_order asc
    loop
      insert into public.patient_protocol_phase_criteria (phase_id, source_criterion_id, description, sort_order)
      values (v_new_phase_id, v_criterion.id, v_criterion.description, v_criterion.sort_order);
    end loop;

    for v_milestone in
      select * from public.protocol_phase_milestones where phase_id = v_phase.id order by sort_order asc
    loop
      insert into public.patient_protocol_phase_milestones (phase_id, source_milestone_id, title, sort_order)
      values (v_new_phase_id, v_milestone.id, v_milestone.title, v_milestone.sort_order);
    end loop;

    for v_education in
      select * from public.protocol_phase_education_items where phase_id = v_phase.id order by sort_order asc
    loop
      insert into public.patient_protocol_phase_education_items
        (phase_id, source_item_id, title, body, media_path, media_type, sort_order)
      values
        (v_new_phase_id, v_education.id, v_education.title, v_education.body, v_education.media_path, v_education.media_type, v_education.sort_order);
    end loop;

    for v_link in
      select spsl.frequency_per_week, spsl.sort_order, sl.id as schedule_library_id, sl.title
      from public.protocol_phase_schedule_links spsl
      join public.schedule_library sl on sl.id = spsl.schedule_id
      where spsl.phase_id = v_phase.id
      order by spsl.sort_order asc
    loop
      insert into public.patient_protocol_schedules (phase_id, source_schedule_id, title, frequency_per_week, sort_order)
      values (v_new_phase_id, v_link.schedule_library_id, v_link.title, v_link.frequency_per_week, v_link.sort_order)
      returning id into v_new_schedule_id;

      for v_schedule_exercise in
        select
          se.exercise_id, se.sort_order, se.prescribed_sets, se.prescribed_reps,
          se.prescribed_duration_seconds, se.prescribed_load_text, se.prescription_note,
          e.title as ex_title, e.description as ex_description, e.instructions as ex_instructions,
          e.media_path as ex_media_path, e.media_type as ex_media_type
        from public.schedule_library_exercises se
        join public.exercise_library e on e.id = se.exercise_id
        where se.schedule_id = v_link.schedule_library_id
        order by se.sort_order asc
      loop
        insert into public.patient_protocol_schedule_exercises
          (schedule_id, source_exercise_id, sort_order, title, description, instructions, media_path, media_type,
           prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text, prescription_note)
        values
          (v_new_schedule_id, v_schedule_exercise.exercise_id, v_schedule_exercise.sort_order,
           v_schedule_exercise.ex_title, v_schedule_exercise.ex_description, v_schedule_exercise.ex_instructions,
           v_schedule_exercise.ex_media_path, v_schedule_exercise.ex_media_type,
           v_schedule_exercise.prescribed_sets, v_schedule_exercise.prescribed_reps, v_schedule_exercise.prescribed_duration_seconds,
           v_schedule_exercise.prescribed_load_text, v_schedule_exercise.prescription_note);
      end loop;
    end loop;
  end loop;

  return v_patient_protocol_id;
end;
$$;

-- ── 7. Weekindicatie op fases ────────────────────────────────────────────

alter table public.protocol_phases
  add column if not exists week_range_label text;

-- ── 8. Blessuretype op patiënten, gesynchroniseerd naar settings ──────────
-- Zelfde eenrichtings-patroon als sync_settings_from_patient() voor
-- geboortedatum/operatiedatum (migratie 035), nu uitgebreid met
-- injury_type. Bewust een ANDER veld dan protocols.injury_category (dat
-- zijn de 7 brede protocol-categorieën) — dit is het patiënt-eigen
-- blessuretype, met exact dezelfde 14 waarden als
-- app/(app)/instellingen/page.tsx's BLESSURE_TYPEN, voor 1-op-1
-- compatibiliteit met wat de patiënt zelf ziet.

alter table public.patients
  add column if not exists injury_type text;

create or replace function public.sync_settings_from_patient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is null then
    return new;
  end if;

  insert into public.settings (user_id, birth_date, surgery_date, injury_type)
  values (new.user_id, new.date_of_birth, new.surgery_date, new.injury_type)
  on conflict (user_id) do update
    set birth_date   = excluded.birth_date,
        surgery_date = excluded.surgery_date,
        injury_type  = excluded.injury_type;

  return new;
end;
$$;

drop trigger if exists patients_sync_settings on public.patients;

create trigger patients_sync_settings
after insert or update of user_id, date_of_birth, surgery_date, injury_type on public.patients
for each row
execute function public.sync_settings_from_patient();

notify pgrst, 'reload schema';
