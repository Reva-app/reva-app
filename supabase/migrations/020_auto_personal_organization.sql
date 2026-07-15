-- 020_auto_personal_organization.sql
-- REVA v2 — Fase 1: elke bestaande (en toekomstige) gebruiker krijgt
-- automatisch een 1-op-1 "persoonlijke werkruimte" (organization + location +
-- patients-rij), zodat de app binnen het multi-tenant-model past zonder dat
-- er iets zichtbaars verandert voor de patiënt. Zie
-- docs/REVA-V2-MASTERPLAN.md §20 Fase 1.
--
-- Dit is een tijdelijke overgangsconstructie: zodra een praktijk een echte
-- organisatie aanmaakt (Fase 2/3) en een patiënt daadwerkelijk koppelt,
-- vervangt dat deze impliciete 1-op-1 organisatie. Tot die tijd zorgt dit
-- ervoor dat elke patiëntgebonden rij straks een geldige patient_id kan
-- krijgen (migratie 021+).
--
-- Raakt geen bestaande kolom of policy — voegt alleen nieuwe rijen toe aan de
-- Fase 0/1-tabellen en een extra, aanvullende trigger op auth.users náást de
-- bestaande handle_new_user()-trigger (die blijft ongewijzigd).

-- ── 1. Herbruikbare functie: maak org + locatie + patiëntrecord voor één user ──

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
begin
  select id into v_patient_id from public.patients where user_id = p_user_id;
  if v_patient_id is not null then
    return v_patient_id;
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

grant execute on function public.ensure_personal_organization(uuid) to service_role;

-- ── 2. Eenmalige backfill voor bestaande gebruikers ─────────────────────────

do $$
declare
  r record;
begin
  for r in select id from auth.users loop
    perform public.ensure_personal_organization(r.id);
  end loop;
end;
$$;

-- ── 3. Trigger voor toekomstige signups (aanvullend op handle_new_user) ─────

create or replace function public.handle_new_user_personal_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_personal_organization(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_personal_org on auth.users;
create trigger on_auth_user_created_personal_org
  after insert on auth.users
  for each row execute function public.handle_new_user_personal_organization();

notify pgrst, 'reload schema';
