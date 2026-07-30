-- 048_protocol_engine_library.sql
-- Fase 5 naar voren gehaald: de echte Protocol Engine (zie
-- docs/REVA-V2-MASTERPLAN.md §7/§20 Fase 5). Blessure → Protocol → Fases →
-- Trainingsschema's → Oefeningen, met een gedeelde oefeningenbibliotheek
-- (REVA-schaal + organisatie-schaal — geen vestiging-schaal in v1, zie
-- masterplan §20 Fase 5 besluit). Dit is uitsluitend de bibliotheek-/
-- sjabloonlaag; de patiëntspecifieke kopie volgt in migratie 049.
--
-- Naamconflict: migratie 034 introduceerde al een `protocols`-tabel, maar
-- expliciet als "lichte catalogus, geen volledige Protocol Engine — dat is
-- Fase 5" (letterlijk citaat uit die migratie). Die tabel wordt hier
-- hernoemd naar `protocol_labels_legacy` — de FK vanuit `patients.protocol_id`
-- blijft intact (Postgres volgt een RENAME automatisch), puur voor
-- historische weergave op oude patiëntdossiers. Geen nieuwe code schrijft
-- hierna nog naar deze tabel; de bijbehorende service-functies in
-- lib/services/portalService.ts worden in dezelfde ronde mechanisch
-- hernoemd (loadLegacyProtocolLabels/createLegacyProtocolLabel).

-- Idempotentie-guard: alleen hernoemen als dat nog niet is gebeurd (anders
-- zou een tweede uitvoering van deze migratie de NIEUWE protocols-tabel
-- per ongeluk hernoemen in plaats van de oude).
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'protocols')
     and not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'protocol_labels_legacy')
  then
    execute 'alter table public.protocols rename to protocol_labels_legacy';
  end if;
end $$;

-- ── 1. Rolgate: wie mag protocollen/oefeningenbibliotheek bouwen? ──────────
-- Bewust smaller dan can_manage_org_patients (organization_owner, therapist,
-- practice_staff): protocol-inhoud is klinisch werk, practice_staff bouwt
-- geen zorgpaden. Toewijzen van een bestaand protocol aan een patiënt loopt
-- via een aparte RPC (migratie 049) die de bredere can_manage_org_patients-
-- groep toelaat — precies zoals set_main_location (040) zijn eigen
-- autorisatiecheck doet i.p.v. op tabel-RLS te leunen.

create or replace function public.can_manage_org_protocols(org_id uuid)
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
        and r.key in ('organization_owner', 'therapist')
    );
$$;

grant execute on function public.can_manage_org_protocols(uuid) to authenticated;

-- ── 2. protocols (nieuwe, echte betekenis) ─────────────────────────────────

create table if not exists public.protocols (
  id                  uuid primary key default gen_random_uuid(),
  scope               text not null check (scope in ('reva', 'organization')),
  organization_id     uuid references public.organizations(id) on delete cascade,
  source_protocol_id  uuid references public.protocols(id) on delete set null,
  injury_category     text not null check (injury_category in (
                         'acl', 'total_knee_replacement', 'total_hip_replacement',
                         'meniscus', 'rotator_cuff', 'ankle_ligament', 'custom'
                       )),
  name                text not null,
  description         text,
  archived            boolean not null default false,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint protocols_scope_org_check check (
    (scope = 'reva' and organization_id is null) or
    (scope = 'organization' and organization_id is not null)
  )
);

create index if not exists protocols_organization_id_idx on public.protocols(organization_id);
create index if not exists protocols_scope_idx on public.protocols(scope);

create trigger set_protocols_updated_at
  before update on public.protocols
  for each row execute function public.set_updated_at();

alter table public.protocols enable row level security;

create policy "Organisatielid leest protocollen (REVA + eigen organisatie)"
  on public.protocols for select
  using (scope = 'reva' or public.is_org_member(organization_id));

create policy "Platform admin beheert REVA-protocollen"
  on public.protocols for all
  using (scope = 'reva' and public.is_platform_admin())
  with check (scope = 'reva' and public.is_platform_admin());

create policy "Bevoegd organisatielid beheert eigen protocollen"
  on public.protocols for all
  using (scope = 'organization' and public.can_manage_org_protocols(organization_id))
  with check (scope = 'organization' and public.can_manage_org_protocols(organization_id));

-- ── 3. protocol_phases ──────────────────────────────────────────────────────
-- Bewust GEEN trigger_type/trigger_value (automatische progressie) — de
-- fysiotherapeut bepaalt altijd zelf wanneer een fase actief wordt. Dit is
-- een bewuste afwijking van het oorspronkelijke masterplan-ontwerp (§7.2),
-- akkoord met de opdrachtgever.

create table if not exists public.protocol_phases (
  id                    uuid primary key default gen_random_uuid(),
  protocol_id           uuid not null references public.protocols(id) on delete cascade,
  sort_order            integer not null default 0,
  name                  text not null,
  description           text,
  therapist_notes       text,
  forbidden_activities  text[] not null default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists protocol_phases_protocol_id_idx on public.protocol_phases(protocol_id);

create trigger set_protocol_phases_updated_at
  before update on public.protocol_phases
  for each row execute function public.set_updated_at();

alter table public.protocol_phases enable row level security;

create policy "Organisatielid leest fases van toegankelijke protocollen"
  on public.protocol_phases for select
  using (exists (
    select 1 from public.protocols p
    where p.id = protocol_id and (p.scope = 'reva' or public.is_org_member(p.organization_id))
  ));

create policy "Platform admin beheert fases van REVA-protocollen"
  on public.protocol_phases for all
  using (exists (select 1 from public.protocols p where p.id = protocol_id and p.scope = 'reva' and public.is_platform_admin()))
  with check (exists (select 1 from public.protocols p where p.id = protocol_id and p.scope = 'reva' and public.is_platform_admin()));

create policy "Bevoegd organisatielid beheert fases van eigen protocollen"
  on public.protocol_phases for all
  using (exists (select 1 from public.protocols p where p.id = protocol_id and p.scope = 'organization' and public.can_manage_org_protocols(p.organization_id)))
  with check (exists (select 1 from public.protocols p where p.id = protocol_id and p.scope = 'organization' and public.can_manage_org_protocols(p.organization_id)));

-- ── 4. protocol_phase_criteria (checklist, geen tijdgebonden trigger) ──────

create table if not exists public.protocol_phase_criteria (
  id           uuid primary key default gen_random_uuid(),
  phase_id     uuid not null references public.protocol_phases(id) on delete cascade,
  description  text not null,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists protocol_phase_criteria_phase_id_idx on public.protocol_phase_criteria(phase_id);

alter table public.protocol_phase_criteria enable row level security;

create policy "Organisatielid leest criteria van toegankelijke fases"
  on public.protocol_phase_criteria for select
  using (exists (
    select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id
    where ph.id = phase_id and (p.scope = 'reva' or public.is_org_member(p.organization_id))
  ));

create policy "Platform admin beheert criteria van REVA-protocollen"
  on public.protocol_phase_criteria for all
  using (exists (select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id where ph.id = phase_id and p.scope = 'reva' and public.is_platform_admin()))
  with check (exists (select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id where ph.id = phase_id and p.scope = 'reva' and public.is_platform_admin()));

create policy "Bevoegd organisatielid beheert criteria van eigen protocollen"
  on public.protocol_phase_criteria for all
  using (exists (select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id where ph.id = phase_id and p.scope = 'organization' and public.can_manage_org_protocols(p.organization_id)))
  with check (exists (select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id where ph.id = phase_id and p.scope = 'organization' and public.can_manage_org_protocols(p.organization_id)));

-- ── 5. protocol_phase_milestones (template, patiënt-facing mijlpalen) ─────

create table if not exists public.protocol_phase_milestones (
  id          uuid primary key default gen_random_uuid(),
  phase_id    uuid not null references public.protocol_phases(id) on delete cascade,
  title       text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists protocol_phase_milestones_phase_id_idx on public.protocol_phase_milestones(phase_id);

alter table public.protocol_phase_milestones enable row level security;

create policy "Organisatielid leest mijlpalen van toegankelijke fases"
  on public.protocol_phase_milestones for select
  using (exists (
    select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id
    where ph.id = phase_id and (p.scope = 'reva' or public.is_org_member(p.organization_id))
  ));

create policy "Platform admin beheert mijlpalen van REVA-protocollen"
  on public.protocol_phase_milestones for all
  using (exists (select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id where ph.id = phase_id and p.scope = 'reva' and public.is_platform_admin()))
  with check (exists (select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id where ph.id = phase_id and p.scope = 'reva' and public.is_platform_admin()));

create policy "Bevoegd organisatielid beheert mijlpalen van eigen protocollen"
  on public.protocol_phase_milestones for all
  using (exists (select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id where ph.id = phase_id and p.scope = 'organization' and public.can_manage_org_protocols(p.organization_id)))
  with check (exists (select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id where ph.id = phase_id and p.scope = 'organization' and public.can_manage_org_protocols(p.organization_id)));

-- ── 6. protocol_phase_education_items ───────────────────────────────────────

create table if not exists public.protocol_phase_education_items (
  id          uuid primary key default gen_random_uuid(),
  phase_id    uuid not null references public.protocol_phases(id) on delete cascade,
  title       text not null,
  body        text,
  media_path  text,
  media_type  text check (media_type is null or media_type in ('image', 'video')),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists protocol_phase_education_items_phase_id_idx on public.protocol_phase_education_items(phase_id);

alter table public.protocol_phase_education_items enable row level security;

create policy "Organisatielid leest educatie van toegankelijke fases"
  on public.protocol_phase_education_items for select
  using (exists (
    select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id
    where ph.id = phase_id and (p.scope = 'reva' or public.is_org_member(p.organization_id))
  ));

create policy "Platform admin beheert educatie van REVA-protocollen"
  on public.protocol_phase_education_items for all
  using (exists (select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id where ph.id = phase_id and p.scope = 'reva' and public.is_platform_admin()))
  with check (exists (select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id where ph.id = phase_id and p.scope = 'reva' and public.is_platform_admin()));

create policy "Bevoegd organisatielid beheert educatie van eigen protocollen"
  on public.protocol_phase_education_items for all
  using (exists (select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id where ph.id = phase_id and p.scope = 'organization' and public.can_manage_org_protocols(p.organization_id)))
  with check (exists (select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id where ph.id = phase_id and p.scope = 'organization' and public.can_manage_org_protocols(p.organization_id)));

-- ── 7. exercise_library (drielaags qua opzet, v1 = reva + organization) ────

create table if not exists public.exercise_library (
  id                          uuid primary key default gen_random_uuid(),
  scope                       text not null check (scope in ('reva', 'organization')),
  organization_id             uuid references public.organizations(id) on delete cascade,
  source_exercise_id          uuid references public.exercise_library(id) on delete set null,
  title                       text not null,
  exercise_type               text not null check (exercise_type in ('kracht', 'conditie', 'mobiliteit', 'stabiliteit', 'rekken', 'anders')),
  description                 text,
  instructions                text,
  media_path                  text,
  media_type                  text check (media_type is null or media_type in ('image', 'video')),
  default_sets                integer,
  default_reps                integer,
  default_duration_seconds    integer,
  default_load_text           text,
  archived                    boolean not null default false,
  created_by                  uuid references auth.users(id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint exercise_library_scope_org_check check (
    (scope = 'reva' and organization_id is null) or
    (scope = 'organization' and organization_id is not null)
  )
);

create index if not exists exercise_library_organization_id_idx on public.exercise_library(organization_id);
create index if not exists exercise_library_scope_idx on public.exercise_library(scope);

create trigger set_exercise_library_updated_at
  before update on public.exercise_library
  for each row execute function public.set_updated_at();

alter table public.exercise_library enable row level security;

create policy "Organisatielid leest oefeningen (REVA + eigen organisatie)"
  on public.exercise_library for select
  using (scope = 'reva' or public.is_org_member(organization_id));

create policy "Platform admin beheert REVA-oefeningen"
  on public.exercise_library for all
  using (scope = 'reva' and public.is_platform_admin())
  with check (scope = 'reva' and public.is_platform_admin());

create policy "Bevoegd organisatielid beheert eigen oefeningen"
  on public.exercise_library for all
  using (scope = 'organization' and public.can_manage_org_protocols(organization_id))
  with check (scope = 'organization' and public.can_manage_org_protocols(organization_id));

-- ── 8. protocol_phase_schedules (het "trainingsschema" + frequentie) ───────

create table if not exists public.protocol_phase_schedules (
  id                  uuid primary key default gen_random_uuid(),
  phase_id            uuid not null references public.protocol_phases(id) on delete cascade,
  title               text not null,
  frequency_per_week  integer not null default 3 check (frequency_per_week between 1 and 21),
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists protocol_phase_schedules_phase_id_idx on public.protocol_phase_schedules(phase_id);

create trigger set_protocol_phase_schedules_updated_at
  before update on public.protocol_phase_schedules
  for each row execute function public.set_updated_at();

alter table public.protocol_phase_schedules enable row level security;

create policy "Organisatielid leest schema's van toegankelijke fases"
  on public.protocol_phase_schedules for select
  using (exists (
    select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id
    where ph.id = phase_id and (p.scope = 'reva' or public.is_org_member(p.organization_id))
  ));

create policy "Platform admin beheert schema's van REVA-protocollen"
  on public.protocol_phase_schedules for all
  using (exists (select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id where ph.id = phase_id and p.scope = 'reva' and public.is_platform_admin()))
  with check (exists (select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id where ph.id = phase_id and p.scope = 'reva' and public.is_platform_admin()));

create policy "Bevoegd organisatielid beheert schema's van eigen protocollen"
  on public.protocol_phase_schedules for all
  using (exists (select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id where ph.id = phase_id and p.scope = 'organization' and public.can_manage_org_protocols(p.organization_id)))
  with check (exists (select 1 from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id where ph.id = phase_id and p.scope = 'organization' and public.can_manage_org_protocols(p.organization_id)));

-- ── 9. protocol_phase_schedule_exercises (junction + voorschrift) ──────────
-- exercise_id is ON DELETE RESTRICT (i.p.v. cascade): een bibliotheekoefening
-- die in een gepubliceerd protocol wordt gebruikt, mag niet stilzwijgend
-- verdwijnen — eerst uit alle schema's verwijderen, dan pas de oefening zelf.

create table if not exists public.protocol_phase_schedule_exercises (
  id                          bigserial primary key,
  schedule_id                 uuid not null references public.protocol_phase_schedules(id) on delete cascade,
  exercise_id                 uuid not null references public.exercise_library(id) on delete restrict,
  sort_order                  integer not null default 0,
  prescribed_sets             integer,
  prescribed_reps             integer,
  prescribed_duration_seconds integer,
  prescribed_load_text        text,
  prescription_note           text,
  created_at                  timestamptz not null default now()
);

create index if not exists protocol_phase_schedule_exercises_schedule_id_idx on public.protocol_phase_schedule_exercises(schedule_id);

alter table public.protocol_phase_schedule_exercises enable row level security;

create policy "Organisatielid leest schema-oefeningen van toegankelijke fases"
  on public.protocol_phase_schedule_exercises for select
  using (exists (
    select 1 from public.protocol_phase_schedules s
    join public.protocol_phases ph on ph.id = s.phase_id
    join public.protocols p on p.id = ph.protocol_id
    where s.id = schedule_id and (p.scope = 'reva' or public.is_org_member(p.organization_id))
  ));

create policy "Platform admin beheert schema-oefeningen van REVA-protocollen"
  on public.protocol_phase_schedule_exercises for all
  using (exists (
    select 1 from public.protocol_phase_schedules s
    join public.protocol_phases ph on ph.id = s.phase_id
    join public.protocols p on p.id = ph.protocol_id
    where s.id = schedule_id and p.scope = 'reva' and public.is_platform_admin()
  ))
  with check (exists (
    select 1 from public.protocol_phase_schedules s
    join public.protocol_phases ph on ph.id = s.phase_id
    join public.protocols p on p.id = ph.protocol_id
    where s.id = schedule_id and p.scope = 'reva' and public.is_platform_admin()
  ));

create policy "Bevoegd organisatielid beheert schema-oefeningen van eigen protocollen"
  on public.protocol_phase_schedule_exercises for all
  using (exists (
    select 1 from public.protocol_phase_schedules s
    join public.protocol_phases ph on ph.id = s.phase_id
    join public.protocols p on p.id = ph.protocol_id
    where s.id = schedule_id and p.scope = 'organization' and public.can_manage_org_protocols(p.organization_id)
  ))
  with check (exists (
    select 1 from public.protocol_phase_schedules s
    join public.protocol_phases ph on ph.id = s.phase_id
    join public.protocols p on p.id = ph.protocol_id
    where s.id = schedule_id and p.scope = 'organization' and public.can_manage_org_protocols(p.organization_id)
  ));

notify pgrst, 'reload schema';
