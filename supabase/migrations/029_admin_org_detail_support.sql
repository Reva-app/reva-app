-- 029_admin_org_detail_support.sql
-- REVA v2 — Fase 2 (uitbreiding): opslag voor organisatielogo's + een
-- functie om organisatieleden (met laatste-login) op te halen voor het
-- organisatiedetailscherm.

-- ── Storage bucket voor organisatielogo's ───────────────────────────────────
-- Zelfde beproefde patroon als dossier-photos/dossier-documents: privé bucket,
-- alleen toegankelijk via signed URLs. Alleen platform admins mogen uploaden/
-- verwijderen — organisaties beheren hun eigen logo pas zodra er een Practice
-- Portal is (Fase 3+).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'organization-logos',
  'organization-logos',
  false,
  2097152, -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

create policy "Platform admin beheert organisatielogo's"
  on storage.objects
  for all
  using (bucket_id = 'organization-logos' and public.is_platform_admin())
  with check (bucket_id = 'organization-logos' and public.is_platform_admin());

-- ── Organisatieleden incl. laatste login ────────────────────────────────────
-- auth.users.last_sign_in_at zit in een beschermd schema waar gewone
-- gebruikers geen SELECT-rechten op hebben — vandaar security definer, met
-- de is_platform_admin()-check in de WHERE-clause zodat niet-platform-admins
-- gegarandeerd een lege set terugkrijgen (geen aparte foutafhandeling nodig).

create or replace function public.admin_list_org_members(org_id uuid)
returns table (
  user_id            uuid,
  full_name          text,
  email              text,
  role_key           text,
  role_name          text,
  location_id        uuid,
  location_name      text,
  membership_status  text,
  last_sign_in_at    timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.user_id,
    p.full_name,
    p.email,
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
    and public.is_platform_admin()
  order by r.scope, r.key, p.full_name;
$$;

grant execute on function public.admin_list_org_members(uuid) to authenticated;
