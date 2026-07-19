-- 047_organization_address_split.sql
-- Splitst het vrije-tekst adresveld op organisaties op in aparte velden
-- (straatnaam/postcode/plaats), zelfde structuur als locations al heeft.
-- De oude `address`-kolom blijft ongebruikt bestaan (geen data-migratie
-- mogelijk vanuit vrije tekst) — nieuwe/bewerkte organisaties gebruiken
-- voortaan de nieuwe kolommen.

alter table public.organizations
  add column if not exists address_street       text,
  add column if not exists address_postal_code   text,
  add column if not exists address_city          text;

notify pgrst, 'reload schema';
