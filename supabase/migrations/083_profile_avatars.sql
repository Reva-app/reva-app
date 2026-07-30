-- 083_profile_avatars.sql
-- Fysio's (en overige gebruikers) konden tot nu toe alleen een profielfoto
-- hebben als die automatisch werd meegenomen vanuit OAuth-metadata (Google-
-- account); e-mail/wachtwoord-accounts (de norm in de Practice Portal)
-- hadden geen enkele manier om zelf een foto in te stellen — terwijl
-- `loadEmployeeOnboardingStatus()`/EmployeeWelcomePanel (migratie 042/e.v.)
-- een "Personaliseer je account"-stap al verwachtte. Deze migratie voegt de
-- ontbrekende upload-mogelijkheid toe.
--
-- Bewust een NIEUWE kolom (avatar_path) i.p.v. avatar_url hergebruiken:
-- avatar_url is altijd een kant-en-klare, direct bruikbare URL (extern, bv.
-- Google's foto-CDN) — een eigen upload heeft een interne opslagpad nodig
-- dat bij het tonen telkens naar een signed URL wordt omgezet (zelfde
-- patroon als organizations.logo_path, migratie 029/038). avatar_url blijft
-- dus de fallback voor accounts zonder eigen upload.

alter table public.profiles
  add column if not exists avatar_path text;

-- ── Storage bucket voor profielfoto's ───────────────────────────────────────
-- Privé bucket, zelfde opzet als organization-logos: alleen via signed URLs
-- leesbaar. SELECT is bewust breed (elke ingelogde gebruiker) — een
-- profielfoto is precies bedoeld om door collega's (en, voor fysio's,
-- eventueel patiënten) gezien te worden, geen gevoelige patiëntdata. Alleen
-- de eigen map mag beschreven/verwijderd worden.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  2097152, -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "Iedere ingelogde gebruiker leest profielfoto's"
  on storage.objects
  for select
  using (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Gebruiker beheert eigen profielfoto"
  on storage.objects
  for all
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── portal_list_org_members: avatar_path toevoegen ─────────────────────────
-- Kan niet met alleen "or replace" omdat de kolomset van de return table
-- wijzigt (zelfde beperking als migratie 042 al constateerde).

drop function if exists public.portal_list_org_members(uuid);

create or replace function public.portal_list_org_members(org_id uuid)
returns table (
  membership_id     uuid,
  user_id           uuid,
  full_name         text,
  first_name        text,
  last_name         text,
  email             text,
  phone             text,
  title             text,
  big_number        text,
  avatar_url        text,
  avatar_path       text,
  role_id           uuid,
  role_key          text,
  role_name         text,
  location_id       uuid,
  location_name     text,
  membership_status text,
  last_sign_in_at   timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    m.user_id,
    p.full_name,
    p.first_name,
    p.last_name,
    p.email,
    p.phone,
    p.title,
    p.big_number,
    p.avatar_url,
    p.avatar_path,
    r.id,
    r.key,
    r.name,
    m.location_id,
    l.name,
    m.status,
    u.last_sign_in_at
  from public.memberships m
  join public.roles r on r.id = m.role_id
  left join public.profiles p on p.id = m.user_id
  left join public.locations l on l.id = m.location_id
  left join auth.users u on u.id = m.user_id
  where m.organization_id = org_id
    and public.is_org_member(org_id)
  order by r.key, p.full_name;
$$;

grant execute on function public.portal_list_org_members(uuid) to authenticated;

notify pgrst, 'reload schema';
