-- 122_receptie_alleen_naw_en_agenda.sql
-- Klinische gegevens alleen voor behandelaars (code-review november 2026).
--
-- Tot nu toe gaf ELK actief organisatielid via is_org_member() leestoegang
-- tot alle klinische data van de praktijk: check-ins, medicatie, intake,
-- dossierdocumenten, staff-notities. Ook de rol practice_staff
-- ("Praktijkmedewerker", waarin migratie 041 receptie/assistent/finance
-- heeft samengevoegd). Besluit eigenaar: de receptie ziet alleen NAW-
-- gegevens en de agenda (AVG-dataminimalisatie, need-to-know).
--
-- Nieuw onderscheid:
--   - klinische rollen (organization_owner, therapist): ongewijzigd, alles;
--   - overige leden (practice_staff): geen directe leestoegang meer tot
--     patients of klinische tabellen. Ze krijgen alleen wat ze nodig hebben
--     via twee afgeschermde RPC's: portal_patient_directory (NAW) en
--     portal_org_agenda (afspraken).
--
-- Meegenomen: patient_intakes was leesbaar voor elk lid ZONDER aal2-eis —
-- met alleen een wachtwoord (zonder tweede factor) konden intakes via de API
-- worden opgehaald. can_view_clinical_data() eist aal2.
--
-- Ruimtes, reserveringen, werkroosters, verlof en collega's blijven voor
-- alle leden zichtbaar (dat is de agenda, geen patiëntdata).

-- ══════════════════════════════════════════════════════════════════════════
-- 1. Helper: mag deze gebruiker klinische gegevens van de praktijk zien?
-- ══════════════════════════════════════════════════════════════════════════
-- Houd de rollenlijst in sync met CLINICAL_ROLES in lib/services/portalService.ts.

create or replace function public.can_view_clinical_data(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin()
    or (
      exists (
        select 1
        from public.memberships m
        join public.roles r on r.id = m.role_id
        where m.organization_id = org_id
          and m.user_id = auth.uid()
          and m.status = 'active'
          and r.key in ('organization_owner', 'therapist')
      )
      and public.session_has_aal2()
    );
$$;

revoke execute on function public.can_view_clinical_data(uuid) from public, anon;
grant execute on function public.can_view_clinical_data(uuid) to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- 2. can_access_patient: de leestoegang van alle klinische tabellen
-- ══════════════════════════════════════════════════════════════════════════
-- Gebruikt door de SELECT-policies van checkins, appointments, medicatie,
-- training, doelen, mijlpalen, dossier, foto's (storage) e.a. (024/036/067).

create or replace function public.can_access_patient(p_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.patients p
    where p.id = p_patient_id
      and (
        p.user_id = auth.uid()
        or public.can_view_clinical_data(p.organization_id)
      )
  );
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- 3. Policies die rechtstreeks op is_org_member leunden
-- ══════════════════════════════════════════════════════════════════════════

-- patients: de rij bevat ook blessure-, operatie- en ontslaggegevens.
drop policy if exists "Organisatielid leest patiënten van eigen organisatie" on public.patients;
drop policy if exists "Behandelaar leest patiënten van eigen organisatie" on public.patients;
create policy "Behandelaar leest patiënten van eigen organisatie"
  on public.patients for select
  using (public.can_view_clinical_data(organization_id));

-- patient_intakes
drop policy if exists "Organisatielid leest intake van eigen organisatie" on public.patient_intakes;
drop policy if exists "Behandelaar leest intake van eigen organisatie" on public.patient_intakes;
create policy "Behandelaar leest intake van eigen organisatie"
  on public.patient_intakes for select
  using (public.can_view_clinical_data(organization_id));

-- patient_staff_notes (85): klinische notities van behandelaars onderling.
drop policy if exists "Organisatielid leest notities van eigen organisatie" on public.patient_staff_notes;
drop policy if exists "Organisatielid voegt notitie toe" on public.patient_staff_notes;
drop policy if exists "Auteur bewerkt eigen notitie" on public.patient_staff_notes;
drop policy if exists "Auteur verwijdert eigen notitie" on public.patient_staff_notes;
drop policy if exists "Behandelaar leest notities van eigen organisatie" on public.patient_staff_notes;
drop policy if exists "Behandelaar voegt notitie toe" on public.patient_staff_notes;

create policy "Behandelaar leest notities van eigen organisatie"
  on public.patient_staff_notes for select
  using (public.can_view_clinical_data(organization_id));

create policy "Behandelaar voegt notitie toe"
  on public.patient_staff_notes for insert
  with check (public.can_view_clinical_data(organization_id) and author_id = auth.uid());

create policy "Auteur bewerkt eigen notitie"
  on public.patient_staff_notes for update
  using (author_id = auth.uid() and public.can_view_clinical_data(organization_id))
  with check (author_id = auth.uid() and public.can_view_clinical_data(organization_id));

create policy "Auteur verwijdert eigen notitie"
  on public.patient_staff_notes for delete
  using (author_id = auth.uid() and public.can_view_clinical_data(organization_id));

-- ══════════════════════════════════════════════════════════════════════════
-- 4. RPC: patiëntenlijst met alleen NAW-gegevens (voor alle leden)
-- ══════════════════════════════════════════════════════════════════════════
-- Bewust een vaste kolomlijst: geen blessuretype/-datum, operatiedatum,
-- herstelplan, ontslaguitkomst of check-ins.

create or replace function public.portal_patient_directory(p_organization_id uuid)
returns table (
  id uuid,
  name text,
  email text,
  phone text,
  date_of_birth date,
  status text,
  location_name text,
  therapist_name text,
  has_account boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.is_platform_admin() or (public.is_org_member(p_organization_id) and public.session_has_aal2())) then
    raise exception 'Geen toegang tot deze organisatie.' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), pp.full_name, p.email)::text,
    coalesce(p.email, pp.email)::text,
    p.phone::text,
    p.date_of_birth,
    p.status::text,
    l.name::text,
    tp.full_name::text,
    (p.user_id is not null)
  from public.patients p
  left join public.profiles pp on pp.id = p.user_id
  left join public.locations l on l.id = p.location_id
  left join public.profiles tp on tp.id = p.assigned_therapist_id
  where p.organization_id = p_organization_id
  order by 2;
end;
$$;

revoke execute on function public.portal_patient_directory(uuid) from public, anon;
grant execute on function public.portal_patient_directory(uuid) to authenticated;

-- Aantal patiënten voor het dashboard (alle leden).
create or replace function public.portal_patient_count(p_organization_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_platform_admin() or (public.is_org_member(p_organization_id) and public.session_has_aal2())
      then (select count(*)::int from public.patients where organization_id = p_organization_id)
    else 0
  end;
$$;

revoke execute on function public.portal_patient_count(uuid) from public, anon;
grant execute on function public.portal_patient_count(uuid) to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- 5. RPC: agenda (patiëntafspraken van de praktijk binnen een periode)
-- ══════════════════════════════════════════════════════════════════════════
-- Afspraken worden door de patiënt zelf ingevoerd en kunnen dus ook over
-- ziekenhuis, MRI of operatie gaan. Behandelaars zien alles; overige leden
-- zien alléén fysio-afspraken, zonder titel en locatie (vrije tekst, kan
-- medisch zijn).

create or replace function public.portal_org_agenda(p_organization_id uuid, p_from date, p_to date)
returns table (
  id uuid,
  patient_id uuid,
  patient_name text,
  appointment_type text,
  date date,
  "time" text,
  provider_name text,
  title text,
  location text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_clinical boolean := public.can_view_clinical_data(p_organization_id);
begin
  if not (v_clinical or (public.is_org_member(p_organization_id) and public.session_has_aal2())) then
    raise exception 'Geen toegang tot deze organisatie.' using errcode = '42501';
  end if;

  return query
  select
    a.id,
    a.patient_id,
    coalesce(pp.full_name, nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''))::text,
    a.appointment_type::text,
    a.date::date,
    a.time::text,
    a.provider_name::text,
    case when v_clinical then a.title::text end,
    case when v_clinical then a.location::text end
  from public.appointments a
  join public.patients p on p.id = a.patient_id
  left join public.profiles pp on pp.id = p.user_id
  where p.organization_id = p_organization_id
    and a.date between p_from and p_to
    and (v_clinical or a.appointment_type = 'fysio')
  order by a.date, a.time nulls last;
end;
$$;

revoke execute on function public.portal_org_agenda(uuid, date, date) from public, anon;
grant execute on function public.portal_org_agenda(uuid, date, date) to authenticated;

notify pgrst, 'reload schema';
