-- 050_patient_protocol_logs.sql
-- Protocol Engine, vervolg op 049: de patiënt-schrijfbare kant. Zodra een
-- protocol is toegewezen, mag de patiënt zelf sessies/oefeningen afvinken en
-- loggen (gewicht/herhalingen/duur/pijnscore) — maar niet de inhoud van het
-- protocol zelf wijzigen (die blijft in de contenttabellen van migratie 049,
-- therapeut-schrijf-only). Deze twee logtabellen zijn daarom bewust apart
-- gehouden en gebruiken de bestaande can_manage_patient()-functie
-- (patiënt zelf, of platform admin) — exact hetzelfde patroon als
-- training_logs vandaag al heeft (024_tenant_aware_rls.sql).

-- ── 1. patient_protocol_session_logs ("ik heb deze sessie gedaan") ────────
-- Eén rij per uitgevoerde sessie van een trainingsschema; dit is wat de
-- "deze week nog X keer"-teller op het schema laat aftellen.

create table if not exists public.patient_protocol_session_logs (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients(id) on delete cascade,
  schedule_id   uuid not null references public.patient_protocol_schedules(id) on delete cascade,
  date          date not null default current_date,
  completed_at  timestamptz not null default now(),
  reflection    text,
  created_at    timestamptz not null default now()
);

create index if not exists patient_protocol_session_logs_patient_id_idx on public.patient_protocol_session_logs(patient_id);
create index if not exists patient_protocol_session_logs_schedule_id_idx on public.patient_protocol_session_logs(schedule_id);

alter table public.patient_protocol_session_logs enable row level security;

create policy "Toegankelijk voor patiënt en organisatielid"
  on public.patient_protocol_session_logs for select
  using (public.can_access_patient(patient_id));

create policy "Patiënt logt eigen sessies"
  on public.patient_protocol_session_logs for insert
  with check (public.can_manage_patient(patient_id));

create policy "Patiënt wijzigt eigen sessielogs"
  on public.patient_protocol_session_logs for update
  using (public.can_manage_patient(patient_id))
  with check (public.can_manage_patient(patient_id));

create policy "Patiënt verwijdert eigen sessielogs"
  on public.patient_protocol_session_logs for delete
  using (public.can_manage_patient(patient_id));

-- ── 2. patient_protocol_exercise_logs (gestructureerde per-oefening cijfers)
-- Dit is de tabel achter "Leg Press week 1 = 20kg → week 8 = 45kg": weight_kg
-- is hier een écht numeriek logveld, los van het vrije-tekst
-- prescribed_load_text op de voorschrijf-/contenttabellen (migratie 049) —
-- therapeuten schrijven flexibel voor, patiënten loggen wat ze echt deden.

create table if not exists public.patient_protocol_exercise_logs (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references public.patients(id) on delete cascade,
  session_log_id      uuid not null references public.patient_protocol_session_logs(id) on delete cascade,
  schedule_exercise_id uuid not null references public.patient_protocol_schedule_exercises(id) on delete cascade,
  date                date not null default current_date,
  completed           boolean not null default true,
  sets                integer,
  reps                integer,
  weight_kg           numeric(6,2),
  duration_seconds    integer,
  pain_score          integer check (pain_score is null or pain_score between 1 and 10),
  note                text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists patient_protocol_exercise_logs_patient_id_idx on public.patient_protocol_exercise_logs(patient_id);
create index if not exists patient_protocol_exercise_logs_schedule_exercise_id_idx on public.patient_protocol_exercise_logs(schedule_exercise_id);
create index if not exists patient_protocol_exercise_logs_session_log_id_idx on public.patient_protocol_exercise_logs(session_log_id);

create trigger set_patient_protocol_exercise_logs_updated_at
  before update on public.patient_protocol_exercise_logs
  for each row execute function public.set_updated_at();

alter table public.patient_protocol_exercise_logs enable row level security;

create policy "Toegankelijk voor patiënt en organisatielid"
  on public.patient_protocol_exercise_logs for select
  using (public.can_access_patient(patient_id));

create policy "Patiënt logt eigen oefeningen"
  on public.patient_protocol_exercise_logs for insert
  with check (public.can_manage_patient(patient_id));

create policy "Patiënt wijzigt eigen oefeninglogs"
  on public.patient_protocol_exercise_logs for update
  using (public.can_manage_patient(patient_id))
  with check (public.can_manage_patient(patient_id));

create policy "Patiënt verwijdert eigen oefeninglogs"
  on public.patient_protocol_exercise_logs for delete
  using (public.can_manage_patient(patient_id));

notify pgrst, 'reload schema';
