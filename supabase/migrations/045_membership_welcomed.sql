-- 045_membership_welcomed.sql
-- Welkomstscherm op /portal voor een net uitgenodigde organisatie-eigenaar,
-- de eerste keer dat die inlogt — additieve kolom, geen RLS-wijziging nodig
-- (memberships UPDATE is sinds migratie 041 al can_manage_org_staff-gated,
-- wat voor de organization_owner die dit paneel als enige te zien krijgt
-- z'n eigen rij altijd toestaat).

alter table public.memberships add column if not exists welcomed_at timestamptz;

notify pgrst, 'reload schema';
