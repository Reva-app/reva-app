-- 073_locatie_terminologie.sql
-- "Vestiging(en)" wordt in de hele UI "Locatie(s)" (logischer/duidelijker
-- voor gebruikers). De database-foutmeldingen hieronder worden 1-op-1
-- doorgegeven aan de gebruiker (zie block_archive_main_location/
-- block_delete_main_location — lib/services/portalService.ts's
-- updatePortalLocationArchived/deletePortalLocationChecked geven
-- error.message ongewijzigd door) of erop gematcht via `.includes(...)`
-- (check_location_capacity, createPortalLocationFull) — dus deze teksten
-- moeten in lockstep met de UI-tekst wijzigen, anders herkent de app de
-- foutmelding niet meer en valt hij terug op een generieke melding.

create or replace function public.block_archive_main_location()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.archived = true and old.is_main_location = true then
    raise exception 'Wijs eerst een andere locatie aan als hoofdlocatie voordat je deze archiveert';
  end if;
  return new;
end;
$$;

create or replace function public.block_delete_main_location()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.is_main_location = true and exists (
    select 1 from public.locations
    where organization_id = old.organization_id
      and id <> old.id
      and not archived
  ) then
    raise exception 'Wijs eerst een andere locatie aan als hoofdlocatie voordat je deze verwijdert';
  end if;
  return old;
end;
$$;

create or replace function public.check_location_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_current integer;
begin
  select max_locations into v_max
  from public.organizations where id = new.organization_id;

  select count(*) into v_current
  from public.locations
  where organization_id = new.organization_id and not archived;

  if v_current >= v_max then
    raise exception 'Maximum aantal locaties bereikt voor deze organisatie (%)', v_max;
  end if;

  return new;
end;
$$;
