-- 139_praktijk_verwijderen_toestaan.sql
-- Mag in zijn geheel opnieuw gedraaid worden.
-- "Er moet altijd minimaal één actieve Practice Owner bestaan" (migratie 041)
-- blokkeerde ook het verwijderen van een hele praktijk: de cascade naar
-- memberships haalt dan ook de laatste eigenaar weg. Is de organisatie zelf
-- al weg (cascade vanaf organizations), dan valt er niets te bewaken.

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
  -- Hele praktijk wordt verwijderd: geen eigenaar meer nodig.
  if tg_op = 'DELETE' and not exists (select 1 from public.organizations where id = old.organization_id) then
    return old;
  end if;

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

-- Eigen schema's van een praktijk verwijzen naar haar eigen oefeningen met
-- "on delete restrict". Bij het verwijderen van de praktijk ruimt de cascade
-- de oefeningen soms eerder op dan de schema's, en dan blokkeert die
-- restrictie. Daarom eerst de eigen schema's weg (hun oefenregels gaan mee).
create or replace function public.cleanup_organization_before_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Koppelingen fase → schema (restrict) eerst, dan de schema's zelf.
  delete from public.protocol_phase_schedule_links
  where schedule_id in (select id from public.schedule_library where organization_id = old.id);
  delete from public.schedule_library where organization_id = old.id;
  -- Vestigingen hebben "on delete restrict" vanuit patiënten en medewerkers:
  -- die koppelingen eerst losmaken (alles gaat daarna toch mee).
  update public.patients set location_id = null where organization_id = old.id and location_id is not null;
  update public.memberships set location_id = null where organization_id = old.id and location_id is not null;
  delete from public.membership_locations
  where membership_id in (select id from public.memberships where organization_id = old.id);
  -- Oud model (vóór migratie 054), alleen als die tabel nog bestaat.
  if to_regclass('public.protocol_phase_schedule_exercises') is not null then
    execute 'delete from public.protocol_phase_schedule_exercises where exercise_id in (select id from public.exercise_library where organization_id = $1)' using old.id;
  end if;
  return old;
end;
$$;

revoke execute on function public.cleanup_organization_before_delete() from public, anon, authenticated;

drop trigger if exists organizations_cleanup_before_delete on public.organizations;
create trigger organizations_cleanup_before_delete
  before delete on public.organizations
  for each row execute function public.cleanup_organization_before_delete();

-- Hoofdvestiging mag mee als de hele praktijk verdwijnt.
create or replace function public.block_delete_main_location()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from public.organizations where id = old.organization_id) then
    return old;
  end if;
  if old.is_main_location = true and exists (
    select 1 from public.locations
    where organization_id = old.organization_id
      and id <> old.id
      and not archived
  ) then
    raise exception 'Wijs eerst een andere vestiging aan als hoofdvestiging voordat je deze verwijdert';
  end if;
  return old;
end;
$$;

-- Daarna: de oude oefenpraktijk opruimen (verzoek eigenaar, 2026-11-12).
delete from public.organizations where id = '7742fb79-f975-41d3-b926-e78a774ecc55' and name = 'Voorbeeld Fysiotherapie';
