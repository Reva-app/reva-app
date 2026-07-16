-- 032_portal_self_service.sql
-- Fase 3 vervolg: praktijken moeten hun eigen omgeving kunnen inrichten
-- vanuit de Practice Portal (/portal) — zelf vestigingen toevoegen en
-- medewerkers koppelen — in plaats van dat dit alleen via het Admin Portal
-- (platform admin) kan. Bewust géén granulaire per-locatie/per-patiënt
-- rechten in deze stap: elk actief organisatielid krijgt dezelfde
-- beheerrechten, net als bij de patiëntdossier-uitbreiding (migratie 031).
-- Fijnmazige RBAC via role_permissions komt pas zodra een praktijk daar
-- concreet om vraagt (zie project-memory voor de onderbouwing).

-- ── Vestigingen: organisatieleden mogen aanmaken en bijwerken ───────────────
-- (SELECT bestond al sinds migratie 018; alleen platform admin kon schrijven.)

create policy "Organisatielid maakt vestigingen aan binnen eigen organisatie"
  on public.locations for insert
  with check (public.is_org_member(organization_id));

create policy "Organisatielid werkt vestigingen bij binnen eigen organisatie"
  on public.locations for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ── Memberships: organisatieleden mogen collega's koppelen en bijwerken ────
-- (SELECT bestond al sinds migratie 030; schrijven kon alleen op de eigen
-- membership-rij of door een platform admin.)

create policy "Organisatielid koppelt medewerkers binnen eigen organisatie"
  on public.memberships for insert
  with check (public.is_org_member(organization_id));

create policy "Organisatielid werkt medewerkers bij binnen eigen organisatie"
  on public.memberships for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ── RPC: organisatieleden ophalen inclusief laatste login ──────────────────
-- Zelfde reden als admin_list_org_members (029): auth.users.last_sign_in_at
-- is niet rechtstreeks leesbaar. Deze variant gate op is_org_member() in
-- plaats van is_platform_admin(), zodat praktijkmedewerkers hun eigen
-- collega's zien maar niets van andere organisaties.

create or replace function public.portal_list_org_members(org_id uuid)
returns table (
  membership_id     uuid,
  user_id           uuid,
  full_name         text,
  email             text,
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
    p.email,
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
  order by r.scope, r.key, p.full_name;
$$;

grant execute on function public.portal_list_org_members(uuid) to authenticated;

-- ── RPC: bestaand account opzoeken op e-mailadres ──────────────────────────
-- Nodig om een collega te kunnen koppelen: gewone gebruikers mogen elkaars
-- `profiles`-rij niet rechtstreeks lezen (alleen eigen rij, zie profiles-RLS).
-- Geeft bewust alleen id + naam terug (geen bulk-enumeratie), en alleen aan
-- gebruikers die zelf al actief lid zijn van minstens één organisatie.

create or replace function public.portal_find_user_by_email(p_email text)
returns table (id uuid, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name
  from public.profiles p
  where lower(p.email) = lower(p_email)
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.status = 'active'
    )
  limit 1;
$$;

grant execute on function public.portal_find_user_by_email(text) to authenticated;
