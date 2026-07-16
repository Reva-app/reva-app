-- 035_sync_patient_settings.sql
-- Fase 3 vervolg: geboortedatum en operatiedatum bestaan zowel in `patients`
-- (door de praktijk ingevuld bij dossieraanmaak) als in `settings` (de
-- patiënt-eigen Instellingen-pagina). Dit zijn dezelfde gegevens, niet twee
-- losse concepten — de praktijk vult ze doorgaans het eerst in, dus die kant
-- is leidend. Zonder synchronisatie moet een patiënt exact dezelfde datums
-- nogmaals intypen tijdens onboarding.
--
-- Bewuste keuze: één richting (patients -> settings), geen volledige
-- bidirectionele sync. Deze twee velden wijzigen zelden; een therapeut die ze
-- corrigeert mag de patiënt-instellingen overschrijven, maar een patiënt die
-- zijn eigen instellingen aanpast hoeft niet terug te schrijven naar het
-- praktijkdossier. Dat voorkomt "wie wint bij een conflict"-complexiteit.
--
-- Overige settings-velden (verzekering, polisnummer, blessurebeschrijving,
-- notificatievoorkeuren) blijven puur patiënt-eigen en worden hier niet
-- aangeraakt.

create or replace function public.sync_settings_from_patient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is null then
    return new;
  end if;

  insert into public.settings (user_id, birth_date, surgery_date)
  values (new.user_id, new.date_of_birth, new.surgery_date)
  on conflict (user_id) do update
    set birth_date   = excluded.birth_date,
        surgery_date = excluded.surgery_date;

  return new;
end;
$$;

drop trigger if exists patients_sync_settings on public.patients;

create trigger patients_sync_settings
after insert or update of user_id, date_of_birth, surgery_date on public.patients
for each row
execute function public.sync_settings_from_patient();
