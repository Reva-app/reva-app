-- 046_ensure_profile_before_invite_backfill.sql
-- Bugfix, ontdekt tijdens het testen van /api/send-invite (auth.admin.generateLink):
-- een account aangemaakt via de Supabase Admin API (generateLink/inviteUserByEmail)
-- blijkt niet betrouwbaar de profiles-rij te krijgen die handle_new_user() normaal
-- op elke auth.users-insert aanmaakt (bevestigd: een testmembership werd correct
-- aangemaakt, maar de bijbehorende profiles-rij bestond niet — de naam-backfill uit
-- migratie 044 had dus niets om bij te werken en faalde stil, zonder foutmelding).
--
-- Fix: ensure_personal_organization mag niet langer aannemen dat er al een
-- profiles-rij bestaat tegen de tijd dat hij de uitnodiging verwerkt — hij zorgt
-- er nu zelf eerst voor (ON CONFLICT DO NOTHING, dus onschadelijk als de rij er
-- via handle_new_user() al wél is, zoals bij het normale OTP-registratiepad).

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
