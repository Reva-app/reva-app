-- 041_medewerkers_full.sql
-- Fase 4 vervolg: de fundering van het gebruikers- en autorisatiesysteem.
-- Consolideert het rollenmodel naar exact drie rollen (Practice Owner,
-- Fysiotherapeut, Praktijkmedewerker), bouwt een echte e-mailuitnodiging
-- voor nieuwe medewerkers (geen wachtwoorden), en voegt werkuren en
-- meerdere-vestigingen-per-medewerker toe.
--
-- Dicht onderweg twee problemen die losstaan van deze feature maar in
-- dezelfde migratie horen: (1) een bestaand rechtenlek op `memberships`
-- waarmee elk actief lid zichzelf kon promoveren tot organization_owner,
-- (2) een interactiebug die zou ontstaan tussen het nieuwe uitnodigings-
-- mechanisme en de bestaande `ensure_personal_organization`-trigger.

-- ── 1. Rolconsolidatie — niet-destructief ───────────────────────────────────

update public.roles set name = 'Practice Owner' where key = 'organization_owner';
update public.roles set name = 'Fysiotherapeut' where key = 'therapist';

insert into public.roles (key, name, scope)
values ('practice_staff', 'Praktijkmedewerker', 'organization')
on conflict (key) do nothing;

update public.memberships
set role_id = (select id from public.roles where key = 'practice_staff')
where role_id in (
  select id from public.roles
  where key in ('organization_admin', 'location_manager', 'reception', 'assistant', 'finance')
);

-- De 5 verouderde rolrijen blijven bewust bestaan (niet-destructief) — alleen
-- role_permissions (0 rijen, ongebruikt) en memberships.role_id verwijzen
-- ernaar, dus dit is puur een "niet meer aanbieden in de app"-wijziging.

-- ── 2. profiles: gestructureerde velden voor de medewerkerskaart ───────────

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone text,
  add column if not exists title text,
  add column if not exists big_number text;

-- ── 3. Rechtenlek dichten op memberships ────────────────────────────────────
-- Vóór deze migratie kon elk actief lid (via de brede "is_org_member"-
-- policies uit migratie 032, plus de zelf-beheer FOR ALL-policy uit 018)
-- zijn eigen role_id aanpassen of nieuwe memberships aanmaken — dus
-- zichzelf promoveren tot organization_owner. Dat wordt hier gedicht.

drop policy if exists "Gebruiker beheert eigen memberships" on public.memberships;
drop policy if exists "Organisatielid koppelt medewerkers binnen eigen organisatie" on public.memberships;
drop policy if exists "Organisatielid werkt medewerkers bij binnen eigen organisatie" on public.memberships;

create or replace function public.can_manage_org_staff(org_id uuid)
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
        and r.key = 'organization_owner'
    );
$$;

grant execute on function public.can_manage_org_staff(uuid) to authenticated;

create policy "Practice owner beheert medewerkers"
  on public.memberships for all
  using (public.can_manage_org_staff(organization_id))
  with check (public.can_manage_org_staff(organization_id));

-- (SELECT via "Organisatielid leest memberships van eigen organisatie",
-- migratie 030, blijft ongewijzigd — elk actief lid ziet collega's.)

-- ── 4. Bijgewerkte rechten-checks: huisstijl/vestigingen alleen Practice Owner

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
        and r.key = 'organization_owner'
    );
$$;

create or replace function public.can_manage_org_locations(org_id uuid)
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
        and r.key = 'organization_owner'
    );
$$;

create or replace function public.can_manage_org_patients(org_id uuid)
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
        and r.key in ('organization_owner', 'therapist', 'practice_staff')
    );
$$;

-- ── 5. Abonnementslimiet voor medewerkers ───────────────────────────────────

alter table public.organizations
  add column if not exists max_members integer not null default 10;

create or replace function public.check_member_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max     integer;
  v_current integer;
begin
  select max_members into v_max from public.organizations where id = new.organization_id;

  select
    (select count(*) from public.memberships where organization_id = new.organization_id and status <> 'suspended')
    + (select count(*) from public.membership_invites where organization_id = new.organization_id and status = 'pending')
  into v_current;

  if v_current >= v_max then
    raise exception 'Maximum aantal medewerkers bereikt voor deze organisatie (%)', v_max;
  end if;

  return new;
end;
$$;

-- ── 6. membership_invites — echte uitnodiging vóór er een account bestaat ──

create table if not exists public.membership_invites (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email           text not null,
  first_name      text not null,
  last_name       text not null,
  role_id         uuid not null references public.roles(id) on delete restrict,
  location_id     uuid references public.locations(id) on delete set null,
  invited_at      timestamptz not null default now(),
  invited_by      uuid references auth.users(id) on delete set null,
  status          text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists membership_invites_pending_email_per_org
  on public.membership_invites (organization_id, lower(email))
  where status = 'pending';

create index if not exists membership_invites_organization_id_idx on public.membership_invites(organization_id);

create trigger set_membership_invites_updated_at
  before update on public.membership_invites
  for each row execute function public.set_updated_at();

create trigger membership_invites_check_capacity
  before insert on public.membership_invites
  for each row execute function public.check_member_capacity();

alter table public.membership_invites enable row level security;

create policy "Practice owner beheert uitnodigingen"
  on public.membership_invites for all
  using (public.can_manage_org_staff(organization_id))
  with check (public.can_manage_org_staff(organization_id));

-- Ook de bestaande memberships-capaciteitscheck (nieuwe/gekoppelde medewerker)
create trigger memberships_check_capacity
  before insert on public.memberships
  for each row execute function public.check_member_capacity();

-- ── 7. membership_locations — optionele extra vestigingen per medewerker ──

create table if not exists public.membership_locations (
  membership_id uuid not null references public.memberships(id) on delete cascade,
  location_id   uuid not null references public.locations(id) on delete restrict,
  created_at    timestamptz not null default now(),
  primary key (membership_id, location_id)
);

alter table public.membership_locations enable row level security;

create policy "Organisatielid leest extra vestigingen van collega's"
  on public.membership_locations for select
  using (
    exists (
      select 1 from public.memberships m
      where m.id = membership_id and public.is_org_member(m.organization_id)
    )
  );

create policy "Practice owner beheert extra vestigingen"
  on public.membership_locations for all
  using (
    exists (
      select 1 from public.memberships m
      where m.id = membership_id and public.can_manage_org_staff(m.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.id = membership_id and public.can_manage_org_staff(m.organization_id)
    )
  );

-- ── 8. work_schedules — eenvoudige werkuren per weekdag ─────────────────────

create table if not exists public.work_schedules (
  id            uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships(id) on delete cascade,
  weekday       text not null check (weekday in ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
  start_time    text,
  end_time      text,
  is_off        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (membership_id, weekday)
);

create trigger set_work_schedules_updated_at
  before update on public.work_schedules
  for each row execute function public.set_updated_at();

alter table public.work_schedules enable row level security;

create policy "Organisatielid leest werkuren van collega's"
  on public.work_schedules for select
  using (
    exists (
      select 1 from public.memberships m
      where m.id = membership_id and public.is_org_member(m.organization_id)
    )
  );

create policy "Practice owner of medewerker zelf beheert werkuren"
  on public.work_schedules for all
  using (
    exists (
      select 1 from public.memberships m
      where m.id = membership_id
        and (public.can_manage_org_staff(m.organization_id) or m.user_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.id = membership_id
        and (public.can_manage_org_staff(m.organization_id) or m.user_id = auth.uid())
    )
  );

-- ── 9. "Er is altijd minimaal één actieve Practice Owner" ──────────────────

create or replace function public.block_last_owner_removal()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_was_owner  boolean;
  v_still_owner boolean;
  v_other_owners integer;
begin
  select r.key = 'organization_owner' into v_was_owner
  from public.roles r where r.id = old.role_id;

  if not v_was_owner or old.status <> 'active' then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    v_still_owner := false;
  else
    select (r.key = 'organization_owner' and new.status = 'active') into v_still_owner
    from public.roles r where r.id = new.role_id;
  end if;

  if v_still_owner then
    return new;
  end if;

  select count(*) into v_other_owners
  from public.memberships m
  join public.roles r on r.id = m.role_id
  where m.organization_id = old.organization_id
    and m.id <> old.id
    and m.status = 'active'
    and r.key = 'organization_owner';

  if v_other_owners = 0 then
    raise exception 'Er moet altijd minimaal één actieve Practice Owner bestaan';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger memberships_block_last_owner_removal
  before update or delete on public.memberships
  for each row
  execute function public.block_last_owner_removal();

-- ── 10. Uitnodiging koppelen bij inschrijving — uitgebreid in de bestaande
--        ensure_personal_organization, geen losse tweede trigger (voorkomt
--        dat er stilzwijgend een overbodige persoonlijke werkruimte +
--        leeg patiëntdossier ontstaat voor een uitgenodigde medewerker).

create or replace function public.ensure_personal_organization(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id  uuid;
  v_org_id      uuid;
  v_loc_id      uuid;
  v_full_name   text;
  v_email       text;
  v_invite      record;
  v_had_invite  boolean := false;
begin
  select id into v_patient_id from public.patients where user_id = p_user_id;
  if v_patient_id is not null then
    return v_patient_id;
  end if;

  select email into v_email from auth.users where id = p_user_id;

  if v_email is not null then
    for v_invite in
      select * from public.membership_invites
      where status = 'pending' and lower(email) = lower(v_email)
    loop
      insert into public.memberships (user_id, organization_id, role_id, location_id, status)
      values (p_user_id, v_invite.organization_id, v_invite.role_id, v_invite.location_id, 'active');

      update public.membership_invites set status = 'accepted' where id = v_invite.id;
      v_had_invite := true;
    end loop;
  end if;

  if v_email is not null then
    select id into v_patient_id
    from public.patients
    where user_id is null and lower(email) = lower(v_email)
    limit 1;

    if v_patient_id is not null then
      update public.patients set user_id = p_user_id where id = v_patient_id;
      return v_patient_id;
    end if;
  end if;

  if v_had_invite then
    return null;
  end if;

  select full_name into v_full_name from public.profiles where id = p_user_id;

  insert into public.organizations (name)
  values (coalesce(nullif(trim(v_full_name), ''), 'Persoonlijke werkruimte'))
  returning id into v_org_id;

  insert into public.locations (organization_id, name)
  values (v_org_id, 'Hoofdlocatie')
  returning id into v_loc_id;

  insert into public.patients (organization_id, location_id, user_id)
  values (v_org_id, v_loc_id, p_user_id)
  returning id into v_patient_id;

  return v_patient_id;
end;
$$;

notify pgrst, 'reload schema';
