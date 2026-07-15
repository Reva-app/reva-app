-- 025_admin_portal_data_access.sql
-- REVA v2 — Fase 2: voorbereiding voor het Super Admin Portal
-- (docs/REVA-V2-MASTERPLAN.md §3.1, §20 Fase 2).
--
-- 1. Kent platform_admin toe aan de oprichter (stef.robberts1@gmail.com), de
--    enige manier om deze rol te krijgen is handmatig via service_role — zie
--    migratie 015. Zonder dit is het Super Admin Portal voor niemand
--    bereikbaar.
-- 2. Voegt een aanvullende select-policy toe aan `profiles` zodat platform
--    admins het gebruikersoverzicht kunnen tonen. Additief naast de
--    bestaande "eigen profiel lezen"-policy (schema.sql) — die blijft
--    ongewijzigd.

insert into public.platform_admins (user_id)
select id from auth.users where email = 'stef.robberts1@gmail.com'
on conflict (user_id) do nothing;

create policy "Platform admin leest alle profielen"
  on public.profiles
  for select
  using (public.is_platform_admin());
