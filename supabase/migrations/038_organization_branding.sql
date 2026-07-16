-- 038_organization_branding.sql
-- Fase 4: basis-branding voor de Practice Portal — logo + primaire kleur,
-- zodat een praktijk direct als "hun eigen platform" aanvoelt. Praktijknaam
-- was al overal dynamisch (organizations.name); dit voegt de twee ontbrekende
-- stukken toe. Bewust geen aparte font-instelling — typografie is onderdeel
-- van REVA's eigen premium uitstraling, niet iets een praktijk hoeft te
-- kiezen.
--
-- `logo_path` bestond al (migratie 029, tot nu toe alleen platform-admin
-- beheerd via /admin). Dit maakt het zelf-service voor de praktijk zelf,
-- zelfde patroon als vestigingen/medewerkers-zelfbeheer (032).

alter table public.organizations
  add column if not exists primary_color text
  check (primary_color is null or primary_color ~ '^#[0-9a-fA-F]{6}$');

-- ── Rolgate: alleen eigenaar/beheerder van de organisatie, niet elke
--    medewerker — branding is een organisatiebrede instelling, geen
--    dagelijkse patiëntenzorg-taak. Zelfde opzet als can_manage_org_patients
--    (034): platform admins mogen altijd, verder een expliciete allowlist.
create or replace function public.can_manage_org_branding(org_id uuid)
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
        and r.key in ('organization_owner', 'organization_admin')
    );
$$;

grant execute on function public.can_manage_org_branding(uuid) to authenticated;

-- ── Organisaties: additieve UPDATE-policy voor branding-beheerders ─────────
-- De bestaande "Platform admin beheert organisaties" (FOR ALL) policy blijft
-- ongewijzigd staan; dit is een tweede, permissieve policy die Postgres
-- ORt met de eerste voor UPDATE-commando's.

create policy "Organisatie-eigenaar/beheerder wijzigt eigen organisatie"
  on public.organizations
  for update
  using (public.can_manage_org_branding(id))
  with check (public.can_manage_org_branding(id));

-- ── Storage: praktijk mag eigen logo beheren ────────────────────────────────
-- Bestaande "Platform admin beheert organisatielogo's" policy (029) blijft
-- staan. Deze tweede policy staat uploaden/verwijderen toe voor wie
-- can_manage_org_branding() heeft op de organisatie die met de mapnaam
-- overeenkomt (upload-pad is altijd `${orgId}/...`, zelfde conventie als
-- dossier-photos/dossier-documents).

create policy "Organisatie-eigenaar/beheerder beheert eigen logo"
  on storage.objects
  for all
  using (
    bucket_id = 'organization-logos'
    and public.can_manage_org_branding(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'organization-logos'
    and public.can_manage_org_branding(((storage.foldername(name))[1])::uuid)
  );
