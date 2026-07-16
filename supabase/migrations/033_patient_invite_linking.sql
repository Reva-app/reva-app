-- 033_patient_invite_linking.sql
-- Fase 3 vervolg: een patiëntdossier dat een praktijk al heeft aangemaakt
-- (migratie 031) moet daadwerkelijk gekoppeld kunnen worden aan een REVA-
-- account — anders blijft "uitnodigen" een lege belofte.
--
-- Belangrijke invariant, geborgd met een unieke index: één auth-account mag
-- maar aan één patients-rij gekoppeld zijn. Reden: set_patient_id_from_user_id
-- (migratie 022) doet `select id into new.patient_id from patients where
-- user_id = new.user_id` zonder limit — bij twee rijen voor dezelfde
-- user_id zou elke insert in de 12 klinische tabellen crashen ("more than
-- one row returned by a subquery used as an expression"). Multi-organisatie-
-- patiënten (iemand die bij twee praktijken loopt) zijn dus bewust nog niet
-- ondersteund; dat is een groter datamodel-vraagstuk voor later.

alter table public.patients
  add column if not exists invited_at timestamptz;

create unique index if not exists patients_user_id_unique
  on public.patients (user_id)
  where user_id is not null;

-- ── Nieuwe accounts: koppel aan een openstaand dossier i.p.v. een nieuwe
--    persoonlijke werkruimte aan te maken, als het e-mailadres matcht ────────
-- ensure_personal_organization checkte tot nu toe alleen "heeft deze
-- user_id al een patients-rij" — dat is bij een gloednieuw account per
-- definitie nee. Nu wordt éérst gekeken of een praktijk al een dossier met
-- ditzelfde e-mailadres heeft klaargezet (user_id nog leeg); zo ja, dat
-- dossier wordt gekoppeld in plaats van een nieuwe solo-organisatie aan te
-- maken.

create or replace function public.ensure_personal_organization(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid;
  v_org_id     uuid;
  v_loc_id     uuid;
  v_full_name  text;
  v_email      text;
begin
  select id into v_patient_id from public.patients where user_id = p_user_id;
  if v_patient_id is not null then
    return v_patient_id;
  end if;

  select email into v_email from auth.users where id = p_user_id;

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
