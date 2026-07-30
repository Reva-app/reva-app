-- 060_admin_platform_activity.sql
-- Platform-brede activiteitscijfers voor het admin-dashboard. last_sign_in_at
-- leeft in het beveiligde auth-schema en heeft daarom een security definer
-- RPC nodig (zelfde reden/patroon als admin_list_org_members, migratie 029),
-- zodat per organisatie het meest recente lidmaatschaps-login bekend is
-- zonder voor elke organisatie apart een round-trip te doen.

create or replace function public.admin_org_last_activity()
returns table (organization_id uuid, last_sign_in_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select m.organization_id, max(u.last_sign_in_at)
  from public.memberships m
  join auth.users u on u.id = m.user_id
  where public.is_platform_admin()
  group by m.organization_id;
$$;

grant execute on function public.admin_org_last_activity() to authenticated;
