-- 036_portal_photo_access.sql
-- Fase 3 vervolg: de nieuwe patiënt-detailpagina in de Practice Portal toont
-- de laatste foto-update van een patiënt "in één oogopslag" voor de
-- fysiotherapeut. De bestaande SELECT-policy op de private `dossier-photos`
-- bucket (migratie 013) staat alleen de eigenaar van de map toe te lezen —
-- praktijkmedewerkers hebben nu geen manier om een signed URL voor een
-- patiëntfoto op te vragen, terwijl ze via can_access_patient() al wel
-- leestoegang hebben tot alle 12 klinische tabellen van hun eigen patiënten.
--
-- Additief: de bestaande "alleen eigenaar"-policy blijft ongewijzigd, dit is
-- een tweede, aanvullende SELECT-policy specifiek voor praktijkpersoneel.

create policy "dossier_photos_select_org_staff"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'dossier-photos'
    and exists (
      select 1 from public.patients p
      where p.user_id::text = (storage.foldername(name))[1]
        and public.can_access_patient(p.id)
    )
  );
