-- 131: interne notities alleen voor de platform admin.
--
-- organizations.support_notes en last_contact_at zijn REVA-interne
-- aantekeningen (klantcontact, afspraken, inschattingen). Ze stonden op de
-- organizations-rij, en die is leesbaar voor elk lid van de praktijk
-- ("Organisatielid leest eigen organisatie") — dus de praktijk kon via de API
-- meelezen. RLS werkt per rij, niet per kolom; daarom verhuizen ze naar een
-- eigen tabel die alleen de platform admin kan lezen en schrijven.

create table if not exists public.organization_admin_notes (
  organization_id  uuid primary key references public.organizations(id) on delete cascade,
  support_notes    text,
  last_contact_at  date,
  updated_at       timestamptz not null default now(),
  updated_by       uuid references auth.users(id) on delete set null
);

alter table public.organization_admin_notes enable row level security;

drop policy if exists "Alleen platform admin" on public.organization_admin_notes;
create policy "Alleen platform admin"
  on public.organization_admin_notes for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Bestaande notities overzetten (alleen als de oude kolommen er nog zijn).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'organizations' and column_name = 'support_notes'
  ) then
    insert into public.organization_admin_notes (organization_id, support_notes, last_contact_at)
    select id, support_notes, last_contact_at
    from public.organizations
    where support_notes is not null or last_contact_at is not null
    on conflict (organization_id) do update
      set support_notes = excluded.support_notes,
          last_contact_at = excluded.last_contact_at;
  end if;
end $$;

alter table public.organizations drop column if exists support_notes;
alter table public.organizations drop column if exists last_contact_at;

notify pgrst, 'reload schema';
