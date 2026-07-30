-- 071_mark_own_membership_welcomed.sql
-- Het welkomstpaneel (WelcomePanel/markMembershipWelcomed) werkte tot nu toe
-- alleen voor organization_owner, omdat memberships-UPDATE sinds migratie 041
-- can_manage_org_staff()-gated is (alleen organization_owner/platform admin).
-- Nu het welkomstpaneel ook aan medewerkers wordt getoond (rolgebonden
-- variant), moet elke gebruiker zijn EIGEN welcomed_at kunnen zetten,
-- ongeacht rol — een gerichte SECURITY DEFINER RPC i.p.v. een bredere RLS-
-- policy, zodat een medewerker nog steeds geen andere velden van zijn eigen
-- of andermans membership-rij kan wijzigen.

create or replace function public.mark_own_membership_welcomed(p_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.memberships
  set welcomed_at = now()
  where id = p_membership_id
    and user_id = auth.uid();
end;
$$;

grant execute on function public.mark_own_membership_welcomed(uuid) to authenticated;
