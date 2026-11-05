-- 128: organisatiestatus afdwingen. Een praktijk die de platform admin op
-- "Gepauzeerd" zet (organizations.status = 'paused'), verloor tot nu toe
-- niets: alle rechtencontroles keken alleen naar het lidmaatschap. Voortaan
-- geven alle controles voor medewerkers 'false' zolang de praktijk gepauzeerd
-- is ('trial' en 'active' werken gewoon).
--
-- Bewust NIET geraakt: patiënten. Die lezen hun eigen dossier via
-- p.user_id = auth.uid() (can_access_patient / can_manage_patient), los van
-- de praktijk — hun gezondheidsgegevens blijven voor henzelf bereikbaar.
-- De platform admin houdt via is_platform_admin() altijd toegang.
--
-- Alle functiebodies zijn verder identiek aan de live-versie
-- (supabase/snapshots/beveiliging-live.sql); alleen de regel
-- "and public.org_is_open(...)" is toegevoegd.

create or replace function public.org_is_open(p_org_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.organizations
    where id = p_org_id and status <> 'paused'
  );
$$;

-- Alleen intern (vanuit de rechtenfuncties hierboven/hieronder, die als eigenaar draaien).
revoke execute on function public.org_is_open(uuid) from public, anon, authenticated;

-- Voor de melding in de portal: "je praktijk is gepauzeerd" i.p.v. "geen toegang".
create or replace function public.my_paused_organization()
returns text
language sql
stable security definer
set search_path to 'public'
as $$
  select o.name
  from public.memberships m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = auth.uid()
    and m.status = 'active'
    and o.status = 'paused'
  limit 1;
$$;

revoke execute on function public.my_paused_organization() from public, anon;
grant execute on function public.my_paused_organization() to authenticated;

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.memberships
    where organization_id = org_id
      and user_id = auth.uid()
      and status = 'active'
      and public.org_is_open(organization_id)
  );
$$;

create or replace function public.is_staff_member()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select public.is_platform_admin()
    or exists (
      select 1 from public.memberships
      where user_id = auth.uid() and status = 'active'
        and public.org_is_open(organization_id)
    );
$$;

create or replace function public.can_manage_patient_protocol_content(p_patient_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
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
          and public.org_is_open(m.organization_id)
          and r.key in ('organization_owner', 'therapist')
      )
      and public.session_has_aal2()
    );
$$;

create or replace function public.can_manage_org_branding(org_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
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
          and public.org_is_open(m.organization_id)
          and r.key = 'organization_owner'
      )
      and public.session_has_aal2()
    );
$$;

create or replace function public.can_manage_org_locations(org_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
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
          and public.org_is_open(m.organization_id)
          and r.key = 'organization_owner'
      )
      and public.session_has_aal2()
    );
$$;

create or replace function public.can_manage_org_staff(org_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
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
          and public.org_is_open(m.organization_id)
          and r.key = 'organization_owner'
      )
      and public.session_has_aal2()
    );
$$;

create or replace function public.can_view_audit_log(org_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
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
          and public.org_is_open(m.organization_id)
          and r.key = 'organization_owner'
      )
      and public.session_has_aal2()
    );
$$;

create or replace function public.can_view_org_analytics(org_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
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
          and public.org_is_open(m.organization_id)
          and r.key = 'organization_owner'
      )
      and public.session_has_aal2()
    );
$$;

create or replace function public.can_manage_org_patients(org_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
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
          and public.org_is_open(m.organization_id)
          and r.key in ('organization_owner', 'therapist')
      )
      and public.session_has_aal2()
    );
$$;

create or replace function public.can_manage_org_protocols(org_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
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
          and public.org_is_open(m.organization_id)
          and r.key in ('organization_owner', 'therapist')
      )
      and public.session_has_aal2()
    );
$$;

create or replace function public.can_view_clinical_data(org_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
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
          and public.org_is_open(m.organization_id)
          and r.key in ('organization_owner', 'therapist')
      )
      and public.session_has_aal2()
    );
$$;
