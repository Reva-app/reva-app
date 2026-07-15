-- 028_organization_detail_fields.sql
-- REVA v2 — Fase 2 (uitbreiding): velden voor het organisatiedetailscherm in
-- het Super Admin Portal. Scope bewust beperkt tot wat nú al bruikbaar is
-- (algemene gegevens, vestigingsplaats, support-notities) — abonnement/
-- Stripe-velden en feature flags komen pas zodra die functionaliteit
-- daadwerkelijk bestaat (Fase 6/7), zie sessie-overleg.
--
-- Puur additief: raakt geen bestaande rij-data (op de status-constraint na,
-- die wordt vervangen door een ruimere variant — alle huidige rijen hebben
-- 'active', dat blijft een geldige waarde).

alter table public.organizations
  add column if not exists logo_path       text,
  add column if not exists kvk_number      text,
  add column if not exists btw_number      text,
  add column if not exists website         text,
  add column if not exists contact_name    text,
  add column if not exists contact_email   text,
  add column if not exists contact_phone   text,
  add column if not exists address         text,
  add column if not exists support_notes   text,
  add column if not exists last_contact_at date;

-- Status krijgt een expliciet trial-stadium naast actief/gepauzeerd.
-- Normaliseer eerst een eventuele oude 'suspended'-waarde naar 'paused',
-- zodat de nieuwe constraint gegarandeerd toepasbaar is.
update public.organizations set status = 'paused' where status = 'suspended';

alter table public.organizations drop constraint if exists organizations_status_check;
alter table public.organizations add constraint organizations_status_check
  check (status in ('trial', 'active', 'paused'));

alter table public.locations
  add column if not exists city text;

notify pgrst, 'reload schema';
