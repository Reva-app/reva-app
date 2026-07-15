-- 026_grant_test_admin.sql
-- REVA v2 — Fase 2: extra platform_admin voor lokaal testen zonder Google
-- OAuth (die route loopt via een externe redirect die eerst nog een
-- toegevoegde localhost-URL in de Supabase Auth redirect-allowlist nodig
-- heeft — zie de sessie-context in docs/REVA-V2-MASTERPLAN.md). Wachtwoord-
-- login gaat rechtstreeks via de Supabase API, zonder externe redirect, en
-- omzeilt dat probleem volledig.
--
-- info@reva-app.nl bestond al als bevestigd account (provider: email).

insert into public.platform_admins (user_id)
select id from auth.users where email = 'info@reva-app.nl'
on conflict (user_id) do nothing;
