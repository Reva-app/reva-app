-- 042_portal_members_extended.sql
-- Fase 4 vervolg: de medewerkerskaart/detailpagina heeft meer profielvelden
-- nodig dan portal_list_org_members (032) tot nu toe teruggaf.

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
