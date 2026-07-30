-- 049_patient_protocol_copies.sql
-- Protocol Engine, vervolg op 048: de patiëntspecifieke KOPIE. Zodra een
-- protocol aan een patiënt wordt toegewezen, wordt de volledige boom
-- (fases → criteria/mijlpalen/educatie/schema's/oefeningen) één keer
-- gekopieerd naar deze tabellen — géén live koppeling met het bronprotocol.
-- Vanaf dat moment kan de fysiotherapeut alles patiëntspecifiek aanpassen
-- zonder het bronprotocol te raken (`source_*_id`-kolommen zijn puur
-- lineage/herkomst, geen live join).
--
-- Lezen/schrijven-scheiding: deze contenttabellen zijn therapeut-schrijf-only.
-- De patiënt zelf heeft hier GEEN insert/update/delete-policy op (in
-- tegenstelling tot elke bestaande can_manage_patient()-tabel) — de patiënt
-- mag straks alleen loggen/afvinken, dat gebeurt in aparte tabellen
-- (migratie 050) die wél via can_manage_patient() patiënt-schrijfbaar zijn.

create or replace function public.can_manage_patient_protocol_content(p_patient_id uuid)
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
      from public.patients p
      join public.memberships m on m.organization_id = p.organization_id
      join public.roles r on r.id = m.role_id
      where p.id = p_patient_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and r.key in ('organization_owner', 'therapist')
    );
$$;

grant execute on function public.can_manage_patient_protocol_content(uuid) to authenticated;

-- ── 1. patient_protocols (de toewijzing zelf) ──────────────────────────────
-- Eén patiënt kan meerdere toewijzingen hebben over tijd (historie), maar
-- nooit meer dan één tegelijk actief/gepauzeerd — afgedwongen via de
-- partial unique index hieronder. Bij een nieuwe toewijzing archiveert de
-- assign_protocol_to_patient-RPC eerst de vorige (zie onderaan dit bestand).

create table if not exists public.patient_protocols (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references public.patients(id) on delete cascade,
  source_protocol_id  uuid references public.protocols(id) on delete set null,
  name                text not null,
  injury_category     text,
  status              text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  assigned_by         uuid references auth.users(id) on delete set null,
  assigned_at         timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index if not exists patient_protocols_one_current_per_patient
  on public.patient_protocols (patient_id)
  where status in ('active', 'paused');

create index if not exists patient_protocols_patient_id_idx on public.patient_protocols(patient_id);

create trigger set_patient_protocols_updated_at
  before update on public.patient_protocols
  for each row execute function public.set_updated_at();

alter table public.patient_protocols enable row level security;

create policy "Toegankelijk voor patiënt en organisatielid"
  on public.patient_protocols for select
  using (public.can_access_patient(patient_id));

create policy "Bevoegd organisatielid beheert patiëntprotocol"
  on public.patient_protocols for all
  using (public.can_manage_patient_protocol_content(patient_id))
  with check (public.can_manage_patient_protocol_content(patient_id));

-- ── 2. patient_protocol_phases ─────────────────────────────────────────────
-- Precies één 'active'-fase per toewijzing tegelijk (partial unique index),
-- dit fungeert meteen als "huidige fase"-opzoeking — geen aparte
-- current_phase_id-kolom nodig op patient_protocols.

create table if not exists public.patient_protocol_phases (
  id                    uuid primary key default gen_random_uuid(),
  patient_protocol_id   uuid not null references public.patient_protocols(id) on delete cascade,
  source_phase_id       uuid references public.protocol_phases(id) on delete set null,
  sort_order            integer not null default 0,
  name                  text not null,
  description           text,
  therapist_notes       text,
  status                text not null default 'not_started' check (status in ('not_started', 'active', 'completed', 'paused')),
  started_at            timestamptz,
  completed_at          timestamptz,
  forbidden_activities  text[] not null default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index if not exists patient_protocol_phases_one_active_per_assignment
  on public.patient_protocol_phases (patient_protocol_id)
  where status = 'active';

create index if not exists patient_protocol_phases_patient_protocol_id_idx on public.patient_protocol_phases(patient_protocol_id);

create trigger set_patient_protocol_phases_updated_at
  before update on public.patient_protocol_phases
  for each row execute function public.set_updated_at();

alter table public.patient_protocol_phases enable row level security;

create policy "Toegankelijk voor patiënt en organisatielid"
  on public.patient_protocol_phases for select
  using (exists (
    select 1 from public.patient_protocols pp
    where pp.id = patient_protocol_id and public.can_access_patient(pp.patient_id)
  ));

create policy "Bevoegd organisatielid beheert fases"
  on public.patient_protocol_phases for all
  using (exists (
    select 1 from public.patient_protocols pp
    where pp.id = patient_protocol_id and public.can_manage_patient_protocol_content(pp.patient_id)
  ))
  with check (exists (
    select 1 from public.patient_protocols pp
    where pp.id = patient_protocol_id and public.can_manage_patient_protocol_content(pp.patient_id)
  ));

-- ── 3. patient_protocol_phase_criteria (checklist, therapeut vinkt af) ─────

create table if not exists public.patient_protocol_phase_criteria (
  id                   uuid primary key default gen_random_uuid(),
  phase_id             uuid not null references public.patient_protocol_phases(id) on delete cascade,
  source_criterion_id  uuid references public.protocol_phase_criteria(id) on delete set null,
  description          text not null,
  sort_order           integer not null default 0,
  met                  boolean not null default false,
  met_at               timestamptz,
  met_by               uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists patient_protocol_phase_criteria_phase_id_idx on public.patient_protocol_phase_criteria(phase_id);

create trigger set_patient_protocol_phase_criteria_updated_at
  before update on public.patient_protocol_phase_criteria
  for each row execute function public.set_updated_at();

alter table public.patient_protocol_phase_criteria enable row level security;

create policy "Toegankelijk voor patiënt en organisatielid"
  on public.patient_protocol_phase_criteria for select
  using (exists (
    select 1 from public.patient_protocol_phases ph
    join public.patient_protocols pp on pp.id = ph.patient_protocol_id
    where ph.id = phase_id and public.can_access_patient(pp.patient_id)
  ));

create policy "Bevoegd organisatielid beheert criteria"
  on public.patient_protocol_phase_criteria for all
  using (exists (
    select 1 from public.patient_protocol_phases ph
    join public.patient_protocols pp on pp.id = ph.patient_protocol_id
    where ph.id = phase_id and public.can_manage_patient_protocol_content(pp.patient_id)
  ))
  with check (exists (
    select 1 from public.patient_protocol_phases ph
    join public.patient_protocols pp on pp.id = ph.patient_protocol_id
    where ph.id = phase_id and public.can_manage_patient_protocol_content(pp.patient_id)
  ));

-- ── 4. patient_protocol_phase_milestones (therapeut vinkt af, niet patiënt —
--    zelfde reden als criteria: dit is protocolinhoud, geen logregel) ──────

create table if not exists public.patient_protocol_phase_milestones (
  id                   uuid primary key default gen_random_uuid(),
  phase_id             uuid not null references public.patient_protocol_phases(id) on delete cascade,
  source_milestone_id  uuid references public.protocol_phase_milestones(id) on delete set null,
  title                text not null,
  sort_order           integer not null default 0,
  completed            boolean not null default false,
  completed_at         timestamptz,
  reflection_text      text,
  pain_score           integer check (pain_score is null or pain_score between 1 and 10),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists patient_protocol_phase_milestones_phase_id_idx on public.patient_protocol_phase_milestones(phase_id);

create trigger set_patient_protocol_phase_milestones_updated_at
  before update on public.patient_protocol_phase_milestones
  for each row execute function public.set_updated_at();

alter table public.patient_protocol_phase_milestones enable row level security;

create policy "Toegankelijk voor patiënt en organisatielid"
  on public.patient_protocol_phase_milestones for select
  using (exists (
    select 1 from public.patient_protocol_phases ph
    join public.patient_protocols pp on pp.id = ph.patient_protocol_id
    where ph.id = phase_id and public.can_access_patient(pp.patient_id)
  ));

create policy "Bevoegd organisatielid beheert mijlpalen"
  on public.patient_protocol_phase_milestones for all
  using (exists (
    select 1 from public.patient_protocol_phases ph
    join public.patient_protocols pp on pp.id = ph.patient_protocol_id
    where ph.id = phase_id and public.can_manage_patient_protocol_content(pp.patient_id)
  ))
  with check (exists (
    select 1 from public.patient_protocol_phases ph
    join public.patient_protocols pp on pp.id = ph.patient_protocol_id
    where ph.id = phase_id and public.can_manage_patient_protocol_content(pp.patient_id)
  ));

-- ── 5. patient_protocol_phase_education_items ──────────────────────────────

create table if not exists public.patient_protocol_phase_education_items (
  id               uuid primary key default gen_random_uuid(),
  phase_id         uuid not null references public.patient_protocol_phases(id) on delete cascade,
  source_item_id   uuid references public.protocol_phase_education_items(id) on delete set null,
  title            text not null,
  body             text,
  media_path       text,
  media_type       text check (media_type is null or media_type in ('image', 'video')),
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists patient_protocol_phase_education_items_phase_id_idx on public.patient_protocol_phase_education_items(phase_id);

alter table public.patient_protocol_phase_education_items enable row level security;

create policy "Toegankelijk voor patiënt en organisatielid"
  on public.patient_protocol_phase_education_items for select
  using (exists (
    select 1 from public.patient_protocol_phases ph
    join public.patient_protocols pp on pp.id = ph.patient_protocol_id
    where ph.id = phase_id and public.can_access_patient(pp.patient_id)
  ));

create policy "Bevoegd organisatielid beheert educatie"
  on public.patient_protocol_phase_education_items for all
  using (exists (
    select 1 from public.patient_protocol_phases ph
    join public.patient_protocols pp on pp.id = ph.patient_protocol_id
    where ph.id = phase_id and public.can_manage_patient_protocol_content(pp.patient_id)
  ))
  with check (exists (
    select 1 from public.patient_protocol_phases ph
    join public.patient_protocols pp on pp.id = ph.patient_protocol_id
    where ph.id = phase_id and public.can_manage_patient_protocol_content(pp.patient_id)
  ));

-- ── 6. patient_protocol_schedules ──────────────────────────────────────────

create table if not exists public.patient_protocol_schedules (
  id                  uuid primary key default gen_random_uuid(),
  phase_id            uuid not null references public.patient_protocol_phases(id) on delete cascade,
  source_schedule_id  uuid references public.protocol_phase_schedules(id) on delete set null,
  title               text not null,
  frequency_per_week  integer not null default 3 check (frequency_per_week between 1 and 21),
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists patient_protocol_schedules_phase_id_idx on public.patient_protocol_schedules(phase_id);

create trigger set_patient_protocol_schedules_updated_at
  before update on public.patient_protocol_schedules
  for each row execute function public.set_updated_at();

alter table public.patient_protocol_schedules enable row level security;

create policy "Toegankelijk voor patiënt en organisatielid"
  on public.patient_protocol_schedules for select
  using (exists (
    select 1 from public.patient_protocol_phases ph
    join public.patient_protocols pp on pp.id = ph.patient_protocol_id
    where ph.id = phase_id and public.can_access_patient(pp.patient_id)
  ));

create policy "Bevoegd organisatielid beheert schema's"
  on public.patient_protocol_schedules for all
  using (exists (
    select 1 from public.patient_protocol_phases ph
    join public.patient_protocols pp on pp.id = ph.patient_protocol_id
    where ph.id = phase_id and public.can_manage_patient_protocol_content(pp.patient_id)
  ))
  with check (exists (
    select 1 from public.patient_protocol_phases ph
    join public.patient_protocols pp on pp.id = ph.patient_protocol_id
    where ph.id = phase_id and public.can_manage_patient_protocol_content(pp.patient_id)
  ));

-- ── 7. patient_protocol_schedule_exercises (wat de patiënt daadwerkelijk
--    ziet — therapeut wijzigt, patiënt logt er tegen via migratie 050) ─────

create table if not exists public.patient_protocol_schedule_exercises (
  id                          uuid primary key default gen_random_uuid(),
  schedule_id                 uuid not null references public.patient_protocol_schedules(id) on delete cascade,
  source_exercise_id          uuid references public.exercise_library(id) on delete set null,
  sort_order                  integer not null default 0,
  title                       text not null,
  description                 text,
  instructions                text,
  media_path                  text,
  media_type                  text check (media_type is null or media_type in ('image', 'video')),
  prescribed_sets             integer,
  prescribed_reps             integer,
  prescribed_duration_seconds integer,
  prescribed_load_text        text,
  prescription_note           text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists patient_protocol_schedule_exercises_schedule_id_idx on public.patient_protocol_schedule_exercises(schedule_id);

create trigger set_patient_protocol_schedule_exercises_updated_at
  before update on public.patient_protocol_schedule_exercises
  for each row execute function public.set_updated_at();

alter table public.patient_protocol_schedule_exercises enable row level security;

create policy "Toegankelijk voor patiënt en organisatielid"
  on public.patient_protocol_schedule_exercises for select
  using (exists (
    select 1 from public.patient_protocol_schedules s
    join public.patient_protocol_phases ph on ph.id = s.phase_id
    join public.patient_protocols pp on pp.id = ph.patient_protocol_id
    where s.id = schedule_id and public.can_access_patient(pp.patient_id)
  ));

create policy "Bevoegd organisatielid beheert schema-oefeningen"
  on public.patient_protocol_schedule_exercises for all
  using (exists (
    select 1 from public.patient_protocol_schedules s
    join public.patient_protocol_phases ph on ph.id = s.phase_id
    join public.patient_protocols pp on pp.id = ph.patient_protocol_id
    where s.id = schedule_id and public.can_manage_patient_protocol_content(pp.patient_id)
  ))
  with check (exists (
    select 1 from public.patient_protocol_schedules s
    join public.patient_protocol_phases ph on ph.id = s.phase_id
    join public.patient_protocols pp on pp.id = ph.patient_protocol_id
    where s.id = schedule_id and public.can_manage_patient_protocol_content(pp.patient_id)
  ));

-- ── 8. assign_protocol_to_patient — de deep-copy RPC ───────────────────────
-- Bewuste uitzondering (zoals set_main_location, migratie 040): deze functie
-- doet zijn EIGEN autorisatiecheck (can_manage_org_patients — de bredere
-- groep incl. practice_staff) i.p.v. op tabel-RLS te leunen, want de
-- deep-copy schrijft naar contenttabellen die alleen organization_owner/
-- therapist rechtstreeks mogen aanraken. Zo mag practice_staff wél een
-- bestaand protocol toewijzen, maar niet de inhoud ervan bewerken.
--
-- Kopieert de volledige boom in één transactie en zet de eerste fase
-- meteen actief. Een eventuele bestaande actieve/gepauzeerde toewijzing
-- wordt eerst gearchiveerd (geen data verloren, gewoon niet meer "huidig").

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
  v_schedule record;
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

    for v_schedule in
      select * from public.protocol_phase_schedules where phase_id = v_phase.id order by sort_order asc
    loop
      insert into public.patient_protocol_schedules (phase_id, source_schedule_id, title, frequency_per_week, sort_order)
      values (v_new_phase_id, v_schedule.id, v_schedule.title, v_schedule.frequency_per_week, v_schedule.sort_order)
      returning id into v_new_schedule_id;

      for v_schedule_exercise in
        select
          se.exercise_id, se.sort_order, se.prescribed_sets, se.prescribed_reps,
          se.prescribed_duration_seconds, se.prescribed_load_text, se.prescription_note,
          e.title as ex_title, e.description as ex_description, e.instructions as ex_instructions,
          e.media_path as ex_media_path, e.media_type as ex_media_type
        from public.protocol_phase_schedule_exercises se
        join public.exercise_library e on e.id = se.exercise_id
        where se.schedule_id = v_schedule.id
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

grant execute on function public.assign_protocol_to_patient(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
