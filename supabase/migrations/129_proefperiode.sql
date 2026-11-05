-- 129: proefperiode met einddatum. Een praktijk met status 'trial' heeft
-- toegang t/m trial_ends_at, plus 3 dagen speling (dan toont de portal een
-- rode balk). Daarna werkt de trial als 'paused' (migratie 128): medewerkers
-- kunnen niet meer in de portal, patiënten houden toegang tot hun eigen
-- gegevens. Er hoeft niets omgezet te worden; de controle kijkt naar de datum.
--
-- trial_ends_at kan alleen door de platform admin gewijzigd worden: de
-- trigger guard_organization_columns (migratie 120) laat praktijken alleen
-- naam, kleur en logo aanpassen.

alter table public.organizations
  add column if not exists trial_ends_at date default (current_date + 30);

-- Bestaande trials: 30 dagen vanaf vandaag (niemand verliest direct toegang).
update public.organizations
set trial_ends_at = current_date + 30
where status = 'trial' and trial_ends_at is null;

-- Het aantal dagen speling na de einddatum. Eén plek, ook gebruikt door de portal (lib/trial.ts).
create or replace function public.trial_grace_days()
returns integer
language sql
immutable
as $$ select 3 $$;

revoke execute on function public.trial_grace_days() from public, anon, authenticated;

create or replace function public.org_is_open(p_org_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.organizations
    where id = p_org_id
      and status <> 'paused'
      and not (
        status = 'trial'
        and trial_ends_at is not null
        and current_date > trial_ends_at + public.trial_grace_days()
      )
  );
$$;

revoke execute on function public.org_is_open(uuid) from public, anon, authenticated;

-- Opvolger van my_paused_organization(): ook een verlopen proefperiode,
-- zodat de portal de juiste uitleg kan tonen.
create or replace function public.my_blocked_organization()
returns table(name text, reason text)
language sql
stable security definer
set search_path to 'public'
as $$
  select o.name,
         case when o.status = 'paused' then 'paused' else 'trial_expired' end
  from public.memberships m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = auth.uid()
    and m.status = 'active'
    and not public.org_is_open(o.id)
  limit 1;
$$;

revoke execute on function public.my_blocked_organization() from public, anon;
grant execute on function public.my_blocked_organization() to authenticated;
