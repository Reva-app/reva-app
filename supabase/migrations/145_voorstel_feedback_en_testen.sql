-- 145: (1) feedback op REVA-voorstellen centraal bijhouden,
--      (2) Testen: objectieve metingen per patiënt, los van het herstelplan.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Feedback op REVA-voorstellen
-- ═══════════════════════════════════════════════════════════════════════════
-- Per voorstel wat een medewerker ermee deed: toegepast, genegeerd of
-- geopend. "Negeren" geldt zo op elk apparaat en voor elke behandelaar van
-- de patiënt, en de praktijk ziet welke soorten voorstellen waardevol zijn.
-- Bevat geen medische inhoud: alleen een voorstel-id en de regel (bv. "pijn").

create table if not exists public.insight_feedback (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  patient_id      uuid not null references public.patients(id) on delete cascade,
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  suggestion_id   text not null check (char_length(suggestion_id) <= 400),
  rule            text not null check (char_length(rule) <= 40),
  action          text not null check (action in ('applied', 'dismissed', 'opened')),
  created_at      timestamptz not null default now()
);

create index if not exists insight_feedback_patient_idx on public.insight_feedback (patient_id);
create index if not exists insight_feedback_org_idx on public.insight_feedback (organization_id, created_at);

-- Organisatie altijd van de patiënt overnemen (niet van de client).
create or replace function public.insight_feedback_set_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select organization_id into new.organization_id from public.patients where id = new.patient_id;
  new.user_id := auth.uid();
  return new;
end;
$$;
revoke execute on function public.insight_feedback_set_org() from public, anon, authenticated;

drop trigger if exists insight_feedback_set_org on public.insight_feedback;
create trigger insight_feedback_set_org before insert on public.insight_feedback
  for each row execute function public.insight_feedback_set_org();

alter table public.insight_feedback enable row level security;

drop policy if exists "Behandelaar leest feedback op voorstellen" on public.insight_feedback;
create policy "Behandelaar leest feedback op voorstellen" on public.insight_feedback
  for select using (public.is_staff_member() and public.can_access_patient(patient_id));

drop policy if exists "Behandelaar legt feedback vast" on public.insight_feedback;
create policy "Behandelaar legt feedback vast" on public.insight_feedback
  for insert with check (user_id = auth.uid() and public.is_staff_member() and public.can_access_patient(patient_id));

-- Overzicht per soort voorstel voor de Analyse-pagina van de praktijk.
create or replace function public.insight_feedback_stats(p_organization_id uuid, p_days integer default 90)
returns table(rule text, applied integer, dismissed integer, opened integer)
language sql
stable
security definer
set search_path = public
as $$
  select f.rule,
    count(*) filter (where f.action = 'applied')::int,
    count(*) filter (where f.action = 'dismissed')::int,
    count(*) filter (where f.action = 'opened')::int
  from public.insight_feedback f
  where f.organization_id = p_organization_id
    and f.created_at >= now() - make_interval(days => greatest(1, least(p_days, 365)))
    and public.can_view_org_analytics(p_organization_id)
  group by f.rule
  order by count(*) desc;
$$;
revoke execute on function public.insight_feedback_stats(uuid, integer) from public, anon;
grant execute on function public.insight_feedback_stats(uuid, integer) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Testen
-- ═══════════════════════════════════════════════════════════════════════════
-- Bibliotheek (REVA + eigen praktijk), per patiënt toegevoegde testen
-- (optioneel gekoppeld aan een fase) en de resultaten in de tijd. Bewust
-- los van het herstelplan: een fysio voegt een test toe wanneer dat zinvol is.

create table if not exists public.test_library (
  id               uuid primary key default gen_random_uuid(),
  scope            text not null default 'organization' check (scope in ('reva', 'organization')),
  organization_id  uuid references public.organizations(id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 120),
  category         text not null check (category in ('kracht', 'mobiliteit', 'functie', 'balans', 'conditie', 'vragenlijst')),
  unit             text not null check (char_length(unit) between 1 and 20),
  higher_is_better boolean not null default true,
  bilateral        boolean not null default false,
  description      text,
  instructions     text,
  body_regions     text[] not null default '{}',
  archived         boolean not null default false,
  created_by       uuid references auth.users(id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  check ((scope = 'reva' and organization_id is null) or (scope = 'organization' and organization_id is not null))
);

create index if not exists test_library_org_idx on public.test_library (organization_id);

alter table public.test_library enable row level security;

drop policy if exists "Medewerker leest testen (REVA + eigen praktijk)" on public.test_library;
create policy "Medewerker leest testen (REVA + eigen praktijk)" on public.test_library
  for select using ((scope = 'reva' and public.is_staff_member()) or public.is_org_member(organization_id));

drop policy if exists "Praktijk beheert eigen testen" on public.test_library;
create policy "Praktijk beheert eigen testen" on public.test_library
  for all using (scope = 'organization' and public.can_manage_org_protocols(organization_id))
  with check (scope = 'organization' and public.can_manage_org_protocols(organization_id));

create table if not exists public.patient_tests (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references public.patients(id) on delete cascade,
  library_test_id  uuid references public.test_library(id) on delete set null,
  phase_id         uuid references public.patient_protocol_phases(id) on delete set null,
  name             text not null check (char_length(name) between 1 and 120),
  category         text not null check (category in ('kracht', 'mobiliteit', 'functie', 'balans', 'conditie', 'vragenlijst')),
  unit             text not null check (char_length(unit) between 1 and 20),
  higher_is_better boolean not null default true,
  bilateral        boolean not null default false,
  involved_side    text check (involved_side in ('left', 'right')),
  instructions     text,
  target_value     numeric(10,2),
  note             text,
  archived         boolean not null default false,
  added_by         uuid references auth.users(id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now()
);

create index if not exists patient_tests_patient_idx on public.patient_tests (patient_id);

alter table public.patient_tests enable row level security;

drop policy if exists "Patiënt en behandelaar lezen testen" on public.patient_tests;
create policy "Patiënt en behandelaar lezen testen" on public.patient_tests
  for select using (public.can_access_patient(patient_id));

drop policy if exists "Behandelaar beheert testen" on public.patient_tests;
create policy "Behandelaar beheert testen" on public.patient_tests
  for all using (public.can_manage_patient_protocol_content(patient_id))
  with check (public.can_manage_patient_protocol_content(patient_id));

create table if not exists public.patient_test_results (
  id               uuid primary key default gen_random_uuid(),
  patient_test_id  uuid not null references public.patient_tests(id) on delete cascade,
  patient_id       uuid not null references public.patients(id) on delete cascade,
  measured_on      date not null default current_date,
  value            numeric(10,2),
  value_left       numeric(10,2),
  value_right      numeric(10,2),
  note             text,
  measured_by      uuid references auth.users(id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  check (value is not null or value_left is not null or value_right is not null)
);

create index if not exists patient_test_results_test_idx on public.patient_test_results (patient_test_id, measured_on);
create index if not exists patient_test_results_patient_idx on public.patient_test_results (patient_id);

-- patient_id van het resultaat altijd gelijk aan die van de test.
create or replace function public.patient_test_results_set_patient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select patient_id into new.patient_id from public.patient_tests where id = new.patient_test_id;
  return new;
end;
$$;
revoke execute on function public.patient_test_results_set_patient() from public, anon, authenticated;

drop trigger if exists patient_test_results_set_patient on public.patient_test_results;
create trigger patient_test_results_set_patient before insert or update on public.patient_test_results
  for each row execute function public.patient_test_results_set_patient();

alter table public.patient_test_results enable row level security;

drop policy if exists "Patiënt en behandelaar lezen resultaten" on public.patient_test_results;
create policy "Patiënt en behandelaar lezen resultaten" on public.patient_test_results
  for select using (public.can_access_patient(patient_id));

drop policy if exists "Behandelaar beheert resultaten" on public.patient_test_results;
create policy "Behandelaar beheert resultaten" on public.patient_test_results
  for all using (public.can_manage_patient_protocol_content(patient_id))
  with check (public.can_manage_patient_protocol_content(patient_id));

-- ── REVA-bibliotheek: gangbare testen ───────────────────────────────────────
insert into public.test_library (scope, name, category, unit, higher_is_better, bilateral, body_regions, description, instructions)
select 'reva', v.name, v.category, v.unit, v.hib, v.bil, v.regions, v.descr, v.instr
from (values
  -- Knie
  ('Single leg hop test', 'functie', 'cm', true, true, array['knie'], 'Sprongafstand op één been; vergelijk met de andere zijde (LSI).', 'Op één been zo ver mogelijk vooruit springen en stabiel landen. Beste van 3 pogingen per been.'),
  ('Triple hop test', 'functie', 'cm', true, true, array['knie'], 'Drie opeenvolgende sprongen op één been.', 'Drie sprongen achter elkaar op hetzelfde been, stabiel landen. Totale afstand, beste van 3.'),
  ('Side hop test', 'functie', 'herhalingen', true, true, array['knie', 'onderbeen'], 'Zijwaartse sprongen over 30 cm in 30 seconden.', 'Zo vaak mogelijk zijwaarts heen en weer springen over twee lijnen 30 cm uit elkaar, 30 seconden.'),
  ('Knie flexie (ROM)', 'mobiliteit', 'graden', true, true, array['knie'], 'Actieve buiging van de knie, gemeten met goniometer.', 'In ruglig, hiel naar de bil schuiven. Meet met goniometer.'),
  ('Knie extensie (ROM)', 'mobiliteit', 'graden', true, true, array['knie'], 'Strekking van de knie; 0° is volledig gestrekt, negatief is een strekkingstekort.', 'In ruglig met rol onder de enkel. Meet met goniometer.'),
  ('Quadricepskracht (dynamometer)', 'kracht', 'kg', true, true, array['knie'], 'Isometrische kracht van de bovenbeenspier.', 'Zittend, knie 60-90° gebogen. Beste van 3 maximale aanspanningen per been.'),
  ('Hamstringkracht (dynamometer)', 'kracht', 'kg', true, true, array['knie', 'heup'], 'Isometrische kracht van de hamstrings.', 'Buiklig of zittend, knie 30-90° gebogen. Beste van 3 per been.'),
  ('KOOS (knie)', 'vragenlijst', 'score', true, false, array['knie'], 'Knee injury and Osteoarthritis Outcome Score, 0-100 (100 = geen klachten).', 'Patiënt vult de vragenlijst in; noteer de gemiddelde score.'),
  ('IKDC', 'vragenlijst', 'score', true, false, array['knie'], 'Subjectief kniefunctieformulier, 0-100.', 'Patiënt vult de vragenlijst in.'),
  ('Lysholm', 'vragenlijst', 'score', true, false, array['knie'], 'Kniefunctie bij ligamentletsel, 0-100.', 'Patiënt vult de vragenlijst in.'),
  ('Y-balance test anterior', 'balans', 'cm', true, true, array['knie', 'onderbeen'], 'Dynamische balans: reikafstand naar voren op één been.', 'Op één been staan, met de andere voet zo ver mogelijk naar voren reiken. Beste van 3.'),
  -- Enkel en voet
  ('Weight-bearing lunge test', 'mobiliteit', 'cm', true, true, array['onderbeen'], 'Dorsaalflexie van de enkel in belaste houding (knie-tot-muur).', 'Voet loodrecht op de muur, knie raakt de muur met hiel aan de grond. Maximale afstand teen-muur.'),
  ('Eenbeensstand ogen dicht', 'balans', 'sec', true, true, array['onderbeen', 'knie'], 'Statische balans op één been.', 'Op één been, ogen dicht, armen over elkaar. Tijd tot verliezen van balans, max 30 sec.'),
  ('Heel raise test', 'kracht', 'herhalingen', true, true, array['onderbeen'], 'Kuitkracht en uithoudingsvermogen.', 'Op één been zo vaak mogelijk op de tenen komen in een vast ritme, volledige uitslag.'),
  ('CAIT (enkelinstabiliteit)', 'vragenlijst', 'score', true, false, array['onderbeen'], 'Cumberland Ankle Instability Tool, 0-30 (hoger = stabieler).', 'Patiënt vult de vragenlijst in.'),
  -- Heup en algemeen
  ('30 seconden stoeltest', 'functie', 'herhalingen', true, false, array['heup', 'knie'], 'Aantal keer opstaan uit een stoel in 30 seconden.', 'Armen gekruist, zo vaak mogelijk volledig opstaan en gaan zitten in 30 sec.'),
  ('Timed Up and Go', 'functie', 'sec', false, false, array['heup', 'knie'], 'Opstaan, 3 meter lopen, omdraaien en weer gaan zitten.', 'Start zittend; tijd vanaf "start" tot weer zitten.'),
  ('6-minuten wandeltest', 'conditie', 'm', true, false, array['heup', 'knie'], 'Afstand die in 6 minuten gewandeld wordt.', 'Zo ver mogelijk wandelen op een vaste baan in 6 minuten.'),
  ('HOOS (heup)', 'vragenlijst', 'score', true, false, array['heup'], 'Hip disability and Osteoarthritis Outcome Score, 0-100.', 'Patiënt vult de vragenlijst in.'),
  ('Heup flexie (ROM)', 'mobiliteit', 'graden', true, true, array['heup'], 'Buiging van de heup, gemeten met goniometer.', 'In ruglig, knie naar de borst. Meet met goniometer.'),
  -- Schouder en arm
  ('Schouder anteflexie (ROM)', 'mobiliteit', 'graden', true, true, array['schouder'], 'Arm voorwaarts heffen.', 'Staand of zittend, arm gestrekt zo hoog mogelijk naar voren-boven.'),
  ('Schouder exorotatie (ROM)', 'mobiliteit', 'graden', true, true, array['schouder'], 'Buitenwaartse rotatie met elleboog tegen het lichaam.', 'Elleboog 90° tegen de zij, onderarm naar buiten draaien.'),
  ('Exorotatiekracht schouder', 'kracht', 'kg', true, true, array['schouder'], 'Isometrische exorotatiekracht (dynamometer).', 'Elleboog 90° tegen de zij. Beste van 3 per arm.'),
  ('QuickDASH', 'vragenlijst', 'score', false, false, array['schouder'], 'Beperkingen van arm, schouder en hand, 0-100 (lager = beter).', 'Patiënt vult de vragenlijst in.'),
  ('SPADI', 'vragenlijst', 'score', false, false, array['schouder'], 'Shoulder Pain and Disability Index, 0-100 (lager = beter).', 'Patiënt vult de vragenlijst in.'),
  ('Handknijpkracht', 'kracht', 'kg', true, true, array['schouder'], 'Grijpkracht met handdynamometer.', 'Zittend, elleboog 90°. Beste van 3 per hand.'),
  -- Rug en nek
  ('Oswestry Disability Index', 'vragenlijst', 'score', false, false, array['rug'], 'Beperkingen door lage rugklachten, 0-100% (lager = beter).', 'Patiënt vult de vragenlijst in.'),
  ('Neck Disability Index', 'vragenlijst', 'score', false, false, array['rug'], 'Beperkingen door nekklachten, 0-50 (lager = beter).', 'Patiënt vult de vragenlijst in.'),
  ('Biering-Sørensen test', 'kracht', 'sec', true, false, array['rug'], 'Uithoudingsvermogen van de rugstrekkers.', 'In buiklig met bovenlichaam over de rand, romp horizontaal houden. Tijd tot loslaten, max 240 sec.'),
  ('Sit-and-reach', 'mobiliteit', 'cm', true, false, array['rug', 'heup'], 'Lenigheid van rug en hamstrings.', 'Zittend met gestrekte benen zo ver mogelijk vooruit reiken.'),
  -- Conditie
  ('Coopertest', 'conditie', 'm', true, false, array['algemeen'], 'Afstand hardlopend in 12 minuten.', 'Zo ver mogelijk lopen in 12 minuten op een baan of veld.'),
  ('Shuttle run test (beep test)', 'conditie', 'trap', true, false, array['algemeen'], 'Uithoudingsvermogen via 20 meter pendelen in oplopend tempo.', 'Pendelen tussen lijnen op 20 m op het piepsignaal. Noteer de laatst gehaalde trap.'),
  ('Yo-Yo intermittent recovery test', 'conditie', 'm', true, false, array['algemeen'], 'Intermitterend uithoudingsvermogen voor teamsporters.', 'Pendelen 2x20 m met 10 sec herstel. Noteer de totale afstand.'),
  ('Loopbandtest tijd tot uitputting', 'conditie', 'min', true, false, array['algemeen'], 'Duur op een loopband met oplopend protocol.', 'Vast protocol (bv. Bruce). Tijd tot de patiënt stopt.'),
  ('Rusthartslag', 'conditie', 'bpm', false, false, array['algemeen'], 'Hartslag in rust, ''s ochtends gemeten.', 'Na 5 minuten rustig zitten of liggen, 1 minuut tellen.'),
  ('Return-to-sport vragenlijst (ACL-RSI)', 'vragenlijst', 'score', true, false, array['knie'], 'Psychologische gereedheid voor terugkeer naar sport, 0-100.', 'Patiënt vult de vragenlijst in.')
) as v(name, category, unit, hib, bil, regions, descr, instr)
where not exists (select 1 from public.test_library t where t.scope = 'reva' and t.name = v.name);

notify pgrst, 'reload schema';
