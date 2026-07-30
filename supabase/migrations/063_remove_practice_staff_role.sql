-- 063_remove_practice_staff_role.sql
-- Rollenmodel terug naar exact 2 rollen: Praktijk eigenaar en Fysiotherapeut.
-- practice_staff ("Praktijkmedewerker") vervalt — bestaande leden met die rol
-- worden Fysiotherapeut.
--
-- Niet-destructief, zelfde patroon als migratie 041 zelf al gebruikte voor
-- haar eigen 5 verouderde rollen: de rolrij zelf blijft bestaan (ongebruikt),
-- alleen memberships/membership_invites worden omgezet. roles.role_id heeft
-- een `on delete restrict`-foreign key, dus een echte delete zou hier
-- sowieso pas kunnen nadat alle verwijzingen zijn omgezet.

update public.memberships
set role_id = (select id from public.roles where key = 'therapist')
where role_id = (select id from public.roles where key = 'practice_staff');

update public.membership_invites
set role_id = (select id from public.roles where key = 'therapist')
where role_id = (select id from public.roles where key = 'practice_staff');

-- can_manage_org_patients(): 'practice_staff' uit de toegestane rollen halen.
-- Geen functionele wijziging voor organization_owner/therapist.
create or replace function public.can_manage_org_patients(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.memberships m
      join public.roles r on r.id = m.role_id
      where m.organization_id = org_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and r.key in ('organization_owner', 'therapist')
    );
$$;
