-- 015_platform_admins.sql
-- REVA v2 — Fase 0: platformbeheerders, los van organisaties.
--
-- Bewust een aparte tabel i.p.v. een rol binnen `memberships` (migratie 018):
-- platformbeheer heeft geen organisatiecontext, en dit voorkomt dat een
-- RLS-bug in de organisatie-scoping ooit per ongeluk platform-brede rechten
-- laat lekken. Zie docs/REVA-V2-MASTERPLAN.md §5.2 en §22 (besluit 1).
--
-- Puur additief: raakt geen bestaande tabel, kolom of policy.

create table if not exists public.platform_admins (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

-- Een gebruiker mag alleen zijn eigen rij lezen (om te checken "ben ik
-- platform admin"). Toekennen/intrekken gebeurt uitsluitend handmatig via
-- service_role — bewust geen insert/update/delete-policy voor gewone
-- gebruikers.
create policy "Gebruiker leest eigen platform-admin-status"
  on public.platform_admins
  for select
  using (auth.uid() = user_id);

-- Herbruikbare RLS-helper voor policies op andere tabellen (organizations,
-- locations, memberships, ...). security definer zodat de check niet zelf
-- weer door RLS op platform_admins geblokkeerd kan worden; search_path
-- vastgezet als bescherming tegen search-path-hijacking.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins where user_id = auth.uid()
  );
$$;

grant execute on function public.is_platform_admin() to authenticated;
