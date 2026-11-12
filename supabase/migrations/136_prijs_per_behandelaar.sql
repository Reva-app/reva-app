-- 136_prijs_per_behandelaar.sql
-- Nieuw prijsmodel (november 2026): per behandelaar in plaats van vaste
-- pakketten. €24 per behandelaar per maand, vanaf de 10e behandelaar €19
-- (getrapt). Patiënten en vestigingen onbeperkt. Maatwerk blijft voor
-- ketens en afwijkende afspraken. Prijzen staan in lib/plans.ts.
--
-- Op 2026-11-12 had geen enkele organisatie een pakket gekozen; oude
-- waarden worden voor de zekerheid toch omgezet.

begin;

alter table public.organizations drop constraint if exists organizations_plan_check;

update public.organizations
set plan = 'behandelaar', max_members = 999, max_locations = 999, max_patients = null
where plan in ('solo', 'team', 'praktijk', 'praktijk_plus');

update public.organizations
set plan = 'maatwerk'
where plan = 'enterprise';

alter table public.organizations add constraint organizations_plan_check
  check (plan in ('behandelaar', 'maatwerk'));

comment on column public.organizations.plan is
  'Pakket: behandelaar (prijs per behandelaar, staffel in lib/plans.ts) of maatwerk; null = nog geen pakket gekozen';

commit;
