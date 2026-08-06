-- 091_copy_intake_goals_on_link.sql
-- Op intake-tijd (PatientWizard, therapeut vult REVA Analyse in) heeft de
-- patiënt nog géén auth.users-rij, dus kunnen de door de therapeut
-- goedgekeurde hersteldoelen (patient_intakes.staged_goals) nog niet direct
-- in de user_id-gebonden goals-tabel gezet worden. Deze migratie kopieert
-- ze zodra patients.user_id alsnog gezet wordt — via de twee bestaande
-- koppelpaden:
--   1. Nieuw account (nieuwe auth.users-rij via /api/send-invite's
--      admin.auth.admin.generateLink): de on_auth_user_created-trigger
--      roept ensure_personal_organization() aan, die hier één regel bij
--      krijgt.
--   2. Bestaand account (e-mailadres matcht al een profiel):
--      invitePortalPatient() in lib/services/portalService.ts zet
--      patients.user_id zelf al bij en roept deze RPC er direct achteraan.
--
-- copy_intake_goals_to_patient() is zelf idempotent (goals_copied_at-guard),
-- dus een dubbele aanroep vanuit beide paden is onschadelijk.

create or replace function public.copy_intake_goals_to_patient(p_patient_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_goal    jsonb;
begin
  select user_id into v_user_id from public.patients where id = p_patient_id;
  if v_user_id is null then
    return;
  end if;

  for v_goal in
    select jsonb_array_elements(staged_goals)
    from public.patient_intakes
    where patient_id = p_patient_id
      and goals_copied_at is null
      and jsonb_array_length(staged_goals) > 0
  loop
    insert into public.goals (user_id, goal_type, icon, title, description, target_date, completed)
    values (
      v_user_id,
      'regular',
      v_goal->>'icon',
      v_goal->>'title',
      v_goal->>'description',
      nullif(v_goal->>'targetDate', '')::date,
      false
    );
  end loop;

  update public.patient_intakes
  set goals_copied_at = now()
  where patient_id = p_patient_id
    and goals_copied_at is null;
end;
$$;

grant execute on function public.copy_intake_goals_to_patient(uuid) to authenticated;

-- ensure_personal_organization() herdefiniëren: identiek aan migratie 046,
-- met één toegevoegde regel in de e-mailmatch-tak (nieuw-account-pad).
create or replace function public.ensure_personal_organization(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id  uuid;
  v_org_id      uuid;
  v_loc_id      uuid;
  v_full_name   text;
  v_email       text;
  v_invite      record;
  v_had_invite  boolean := false;
begin
  select id into v_patient_id from public.patients where user_id = p_user_id;
  if v_patient_id is not null then
    return v_patient_id;
  end if;

  select email into v_email from auth.users where id = p_user_id;

  insert into public.profiles (id, email)
  values (p_user_id, v_email)
  on conflict (id) do nothing;

  if v_email is not null then
    for v_invite in
      select * from public.membership_invites
      where status = 'pending' and lower(email) = lower(v_email)
    loop
      insert into public.memberships (user_id, organization_id, role_id, location_id, status)
      values (p_user_id, v_invite.organization_id, v_invite.role_id, v_invite.location_id, 'active');

      update public.profiles
      set first_name = v_invite.first_name,
          last_name = v_invite.last_name,
          full_name = trim(v_invite.first_name || ' ' || v_invite.last_name)
      where id = p_user_id;

      update public.membership_invites set status = 'accepted' where id = v_invite.id;
      v_had_invite := true;
    end loop;
  end if;

  if v_email is not null then
    select id into v_patient_id
    from public.patients
    where user_id is null and lower(email) = lower(v_email)
    limit 1;

    if v_patient_id is not null then
      update public.patients set user_id = p_user_id where id = v_patient_id;
      perform public.copy_intake_goals_to_patient(v_patient_id);
      return v_patient_id;
    end if;
  end if;

  if v_had_invite then
    return null;
  end if;

  select full_name into v_full_name from public.profiles where id = p_user_id;

  insert into public.organizations (name)
  values (coalesce(nullif(trim(v_full_name), ''), 'Persoonlijke werkruimte'))
  returning id into v_org_id;

  insert into public.locations (organization_id, name)
  values (v_org_id, 'Hoofdlocatie')
  returning id into v_loc_id;

  insert into public.patients (organization_id, location_id, user_id)
  values (v_org_id, v_loc_id, p_user_id)
  returning id into v_patient_id;

  return v_patient_id;
end;
$$;

notify pgrst, 'reload schema';
