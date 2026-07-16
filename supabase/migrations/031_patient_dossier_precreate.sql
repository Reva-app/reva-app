-- Fase 3 vervolg: praktijken moeten een patiëntdossier kunnen aanmaken
-- vóórdat de patiënt een eigen account heeft (zie CLAUDE.md / masterplan:
-- "een dossier kan bestaan vóór een patiënt wordt uitgenodigd voor de
-- Patient Portal"). Tot nu toe had `patients` geen eigen naam/e-mail
-- velden, dus zonder user_id was een dossier feitelijk anoniem.

alter table public.patients
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists date_of_birth date;

-- Organisatieleden mochten patiënten van hun eigen organisatie al lezen
-- (migratie 019/024), maar konden er nog geen aanmaken of bijwerken —
-- dat was tot nu toe alleen voorbehouden aan de patiënt zelf of een
-- platform admin. Voegt gerichte INSERT/UPDATE toe, bewust zonder DELETE
-- (dossiers verwijderen blijft voorlopig uit scope).
create policy "Organisatielid maakt patiënten aan binnen eigen organisatie"
  on public.patients for insert
  with check (public.is_org_member(organization_id));

create policy "Organisatielid werkt patiënten bij binnen eigen organisatie"
  on public.patients for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
