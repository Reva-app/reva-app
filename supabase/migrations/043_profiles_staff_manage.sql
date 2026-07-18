-- 043_profiles_staff_manage.sql
-- Fase 4 vervolg: Tab 1 (Algemene gegevens) van de medewerkersdetailpagina
-- moet door de Practice Owner bewerkbaar zijn voor een collega (bv. een
-- BIG-nummer of functietitel aanvullen), niet alleen door de medewerker
-- zelf. `profiles` had tot nu toe uitsluitend zelf-only RLS. Additieve
-- policy — de bestaande "alleen zichzelf"-policy blijft ongewijzigd staan.

create policy "Practice owner beheert profielen van eigen medewerkers"
  on public.profiles for update
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = profiles.id
        and public.can_manage_org_staff(m.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.user_id = profiles.id
        and public.can_manage_org_staff(m.organization_id)
    )
  );
