-- 120_platform_admin_mfa_en_org_kolomguard.sql
-- Twee fixes uit de code-review van november 2026.
--
-- 1. Platform-beheerder zonder tweestapsverificatie
--    is_platform_admin() eiste geen aal2, terwijl die tak in vrijwel elke
--    RLS-policy toegang geeft tot ALLE organisaties en patiënten. Migratie
--    067 dwong aal2 bewust alleen af voor het organisatielid-pad — waardoor
--    het zwaarste account op het platform met één wachtwoord toegankelijk
--    was. Vanaf nu: platform-adminrechten gelden alleen in een aal2-sessie.
--    De AdminGate (components/auth/AdminGate.tsx) laat de beheerder eerst
--    door het bestaande MFA-instel-/challengescherm lopen.
--
--    LET OP: de admin-check in de UI (checkIsPlatformAdmin) leest bewust
--    rechtstreeks de eigen rij uit platform_admins (policy op auth.uid(),
--    geen aal2) — anders kan de AdminGate in een aal1-sessie niet zien dat
--    iemand beheerder is en dus ook het MFA-scherm niet tonen.
--
--    Kwijtgeraakte authenticator van de beheerder zelf: factor verwijderen
--    via Supabase Dashboard → Authentication → Users → [gebruiker] → MFA.

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins where user_id = auth.uid()
  ) and public.session_has_aal2();
$$;

-- 2. Organisatie-eigenaar kon de volledige organizations-rij wijzigen
--    De UPDATE-policy uit migratie 038 (can_manage_org_branding) is bedoeld
--    voor de huisstijl, maar RLS beperkt geen kolommen — een eigenaar kon
--    via een directe API-call ook status (paused → active), max_members,
--    max_locations, support_notes en de bedrijfsgegevens aanpassen.
--    De Practice Portal schrijft alleen name, primary_color en logo_path
--    (lib/services/portalService.ts: updatePortalBranding/uploadPortalLogo);
--    al het andere is voorbehouden aan de platform-beheerder.
--
--    Whitelist i.p.v. blacklist: een kolom die later wordt toegevoegd is
--    standaard beschermd tot hij hier expliciet wordt vrijgegeven.
--    auth.uid() is null = service-role/SQL-editor (server-side), die mag alles.

create or replace function public.guard_organization_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_editable constant text[] := array['name', 'primary_color', 'logo_path', 'updated_at'];
begin
  if auth.uid() is null or public.is_platform_admin() then
    return new;
  end if;

  if (to_jsonb(new) - v_owner_editable) is distinct from (to_jsonb(old) - v_owner_editable) then
    raise exception 'Alleen naam, kleur en logo van de organisatie kunnen vanuit de praktijk worden gewijzigd.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_organization_columns() from public, anon, authenticated;

drop trigger if exists guard_organization_columns on public.organizations;
create trigger guard_organization_columns
  before update on public.organizations
  for each row execute function public.guard_organization_columns();

notify pgrst, 'reload schema';
