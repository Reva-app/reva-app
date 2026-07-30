-- 076_patient_staff_notes.sql
-- Fysio-onderling logboek per patiënt: meerdere vrije-tekst-notities, elk
-- met een eigen auteur en tijdstip, zichtbaar voor alle actieve leden van de
-- organisatie (niet voor de patiënt zelf — bewust GEEN can_access_patient()
-- hergebruikt, want die staat ook de patiënt zelf toe; hier alleen
-- is_org_member()). Bestond nog niet: de dichtstbijzijnde bestaande
-- patronen zijn organizations.support_notes (één overschreven veld, geen
-- meerdere entries) en patient_protocol_session_logs.reflection
-- (patiënt-eigen tekst, alleen-lezen voor staff) — geen van beide is een
-- staff-geschreven, meerdere-auteurs-logboek.

create table if not exists public.patient_staff_notes (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  author_id       uuid references auth.users(id) on delete set null,
  note            text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists patient_staff_notes_patient_created_idx
  on public.patient_staff_notes (patient_id, created_at desc);

-- set_updated_at() bestaat al sinds schema.sql — direct hergebruiken.
create trigger set_patient_staff_notes_updated_at
  before update on public.patient_staff_notes
  for each row execute function public.set_updated_at();

alter table public.patient_staff_notes enable row level security;

create policy "Organisatielid leest notities van eigen organisatie"
  on public.patient_staff_notes for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());

create policy "Organisatielid voegt notitie toe"
  on public.patient_staff_notes for insert
  with check (public.is_org_member(organization_id) and author_id = auth.uid());

create policy "Auteur bewerkt eigen notitie"
  on public.patient_staff_notes for update
  using (author_id = auth.uid() and public.is_org_member(organization_id))
  with check (author_id = auth.uid() and public.is_org_member(organization_id));

create policy "Auteur verwijdert eigen notitie"
  on public.patient_staff_notes for delete
  using (author_id = auth.uid() and public.is_org_member(organization_id));

notify pgrst, 'reload schema';
