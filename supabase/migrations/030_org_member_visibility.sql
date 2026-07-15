-- 030_org_member_visibility.sql
-- REVA v2 — Fase 3: organisatieleden mogen elkaars (actieve) lidmaatschap
-- binnen dezelfde organisatie zien — nodig voor de Practice Portal (team-
-- overzicht, "aantal collega's" op het dashboard). Additief naast de
-- bestaande "eigen memberships beheren"-policy (migratie 018), die
-- ongewijzigd blijft — dit voegt alleen leesrechten toe, geen schrijfrechten.

create policy "Organisatielid leest memberships van eigen organisatie"
  on public.memberships
  for select
  using (public.is_org_member(organization_id));
