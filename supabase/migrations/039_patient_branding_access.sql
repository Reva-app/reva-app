-- 039_patient_branding_access.sql
-- Fase 4 vervolg: de huisstijl van een organisatie moet ook zichtbaar zijn
-- voor de patiënten die eronder vallen, niet alleen voor de praktijkstaf in
-- de Practice Portal. Twee bestaande gaten dichten:
--
-- 1. Patiënten hebben nooit leestoegang gehad tot `organizations` — de
--    additieve SELECT-policy uit migratie 018 dekt alleen organisatieleden
--    (via memberships), niet patiënten (die geen membership hebben, alleen
--    een `patients`-rij). Een brede SELECT-policy zou ook kvk/btw/contact-
--    gegevens blootleggen aan patiënten — in plaats daarvan een smalle,
--    beveiligde RPC die alleen de drie huisstijl-velden teruggeeft.
--
-- 2. De storage-policy op `organization-logos` uit migratie 038 dekt alleen
--    can_manage_org_branding() (eigenaar/beheerder) — een gewone
--    behandelaar of een patiënt kon het al wél gedeelde logo dus niet eens
--    laden (geen leesrecht op het storage-object). Additieve SELECT-only
--    policy voor alle organisatieleden (ongeacht rol) én patiënten van de
--    organisatie.

create or replace function public.patient_organization_branding()
returns table (name text, primary_color text, logo_path text)
language sql
stable
security definer
set search_path = public
as $$
  select o.name, o.primary_color, o.logo_path
  from public.organizations o
  join public.patients p on p.organization_id = o.id
  where p.user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.patient_organization_branding() to authenticated;

create policy "Organisatieleden en patiënten lezen organisatielogo"
  on storage.objects
  for select
  using (
    bucket_id = 'organization-logos'
    and (
      public.is_org_member(((storage.foldername(name))[1])::uuid)
      or exists (
        select 1 from public.patients p
        where p.organization_id = ((storage.foldername(name))[1])::uuid
          and p.user_id = auth.uid()
      )
    )
  );
