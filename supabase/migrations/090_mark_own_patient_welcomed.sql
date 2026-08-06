-- 090_mark_own_patient_welcomed.sql
-- Patiënten mogen hun eigen patients-rij sinds migratie 070 alleen nog
-- lezen (for select only), niet meer wijzigen — een gerichte SECURITY
-- DEFINER RPC zoals mark_own_membership_welcomed (071) is daarom nodig om
-- welcomed_at te kunnen zetten zonder de patients-RLS te verruimen.

create or replace function public.mark_own_patient_welcomed(p_patient_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.patients
  set welcomed_at = now()
  where id = p_patient_id
    and user_id = auth.uid();
end;
$$;

grant execute on function public.mark_own_patient_welcomed(uuid) to authenticated;
