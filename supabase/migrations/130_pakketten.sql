-- 130: pakketten per organisatie (Solo, Team, Praktijk, Praktijk Plus, Enterprise, Maatwerk).
--
-- Het pakket bepaalt de limieten. Bij Solo/Team/Praktijk/Praktijk Plus vult de beheeromgeving
-- max_members / max_locations / max_patients automatisch in vanuit lib/plans.ts
-- (één bron voor prijzen en aantallen); bij Enterprise en Maatwerk beheert de
-- platform admin ze zelf, net als een afwijkende maandprijs.
--
-- Limieten:
-- - medewerkers en vestigingen: hard, zoals al sinds migraties 040/041
--   (check_member_capacity / check_location_capacity);
-- - patiënten: zacht. Er wordt nooit iets geblokkeerd; de portal waarschuwt de
--   Practice Owner vanaf 90% en de platform admin ziet het in het overzicht.
--   Telt alleen actieve patiënten (status 'active' en niet uitbehandeld).
--
-- Alleen de platform admin kan deze kolommen wijzigen: de trigger
-- guard_organization_columns (migratie 120) laat praktijken alleen naam,
-- kleur en logo aanpassen.

alter table public.organizations
  add column if not exists plan text,
  add column if not exists billing_interval text not null default 'month'
    check (billing_interval in ('month', 'year')),
  add column if not exists custom_monthly_price_cents integer
    check (custom_monthly_price_cents is null or custom_monthly_price_cents >= 0),
  add column if not exists max_patients integer
    check (max_patients is null or max_patients >= 0);

-- Los van de kolom, zodat opnieuw draaien de lijst ook bijwerkt.
alter table public.organizations drop constraint if exists organizations_plan_check;
alter table public.organizations add constraint organizations_plan_check
  check (plan in ('solo', 'team', 'praktijk', 'praktijk_plus', 'enterprise', 'maatwerk'));

comment on column public.organizations.plan is 'Pakket; null = nog geen pakket gekozen. Prijzen/aantallen: lib/plans.ts';
comment on column public.organizations.max_patients is 'Zachte limiet op actieve patiënten; null = onbeperkt';
comment on column public.organizations.custom_monthly_price_cents is 'Afwijkende maandprijs (Enterprise/Maatwerk); null = standaardprijs van het pakket';
