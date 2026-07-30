-- 067_mfa_enforcement.sql
-- Verplichte tweestapsverificatie (TOTP) voor Practice Portal-leden
-- (organization_owner/therapist) — afgedwongen op databaseniveau, niet
-- alleen in de UI. Zonder deze RLS-laag zou een gestolen wachtwoord via een
-- directe API-aanroep (buiten de website om) nog steeds volledige toegang
-- tot gezondheidsdata geven.
--
-- Patiënten en platform-beheerders blijven buiten deze wijziging — alleen
-- het organisatielid-/rol-pad van elke functie krijgt de aal2-eis, nooit de
-- is_platform_admin()-tak, nooit het patiënt-zelf-pad.

create or replace function public.session_has_aal2()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'aal'), 'aal1') = 'aal2';
$$;

grant execute on function public.session_has_aal2() to authenticated;

-- ── 1. can_access_patient (024) — leestoegang tot klinische data ──────────

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
        or (public.is_org_member(p.organization_id) and public.session_has_aal2())
        or public.is_platform_admin()
      )
  );
$$;

-- ── 2. can_manage_org_patients (063) ───────────────────────────────────────

create or replace function public.can_manage_org_patients(org_id uuid)
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

-- ── 3. can_manage_org_staff (041) ──────────────────────────────────────────

create or replace function public.can_manage_org_staff(org_id uuid)
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
          and r.key = 'organization_owner'
      )
      and public.session_has_aal2()
    );
$$;

-- ── 4. can_manage_org_locations (041) ──────────────────────────────────────

create or replace function public.can_manage_org_locations(org_id uuid)
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
          and r.key = 'organization_owner'
      )
      and public.session_has_aal2()
    );
$$;

-- ── 5. can_manage_org_branding (041) ───────────────────────────────────────

create or replace function public.can_manage_org_branding(org_id uuid)
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
          and r.key = 'organization_owner'
      )
      and public.session_has_aal2()
    );
$$;

-- ── 6. can_manage_org_protocols (048) ──────────────────────────────────────

create or replace function public.can_manage_org_protocols(org_id uuid)
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

-- ── 7. can_manage_patient_protocol_content (049) ───────────────────────────

create or replace function public.can_manage_patient_protocol_content(p_patient_id uuid)
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
        from public.patients p
        join public.memberships m on m.organization_id = p.organization_id
        join public.roles r on r.id = m.role_id
        where p.id = p_patient_id
          and m.user_id = auth.uid()
          and m.status = 'active'
          and r.key in ('organization_owner', 'therapist')
      )
      and public.session_has_aal2()
    );
$$;

-- ── 8. can_view_org_analytics (064) ────────────────────────────────────────

create or replace function public.can_view_org_analytics(org_id uuid)
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
          and r.key = 'organization_owner'
      )
      and public.session_has_aal2()
    );
$$;

-- ── 9. can_view_audit_log (066) ────────────────────────────────────────────

create or replace function public.can_view_audit_log(org_id uuid)
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
          and r.key = 'organization_owner'
      )
      and public.session_has_aal2()
    );
$$;

notify pgrst, 'reload schema';
