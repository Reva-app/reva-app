-- 087_linter_hardening.sql
-- Naar aanleiding van Supabase's eigen Database Linter (Security Advisor).
-- Twee categorieën fixes hieronder; een derde categorie (leaked password
-- protection) staat NIET in deze migratie — dat is een Auth-instelling in
-- het Supabase Dashboard, niet iets dat via SQL te zetten is.

-- ══════════════════════════════════════════════════════════════════════════
-- 1. function_search_path_mutable — 3 functies zonder vastgezet search_path
-- ══════════════════════════════════════════════════════════════════════════
-- Zonder `set search_path` erft een functie de search_path van de sessie van
-- de AANROEPER. Bij een SECURITY DEFINER-functie (session_has_aal2 wordt
-- overal binnen RLS-policies gebruikt) kan een aanroeper in theorie een
-- object met dezelfde naam in een schema vóór 'public' in zijn eigen
-- search_path zetten, en zo de functie iets anders laten aanroepen dan
-- bedoeld ("search_path hijacking"). Voor set_updated_at/
-- enforce_subscription_columns_readonly (triggerfuncties, geen externe
-- input) is het risico theoretisch, maar de fix is gratis — gewoon overal
-- consistent toepassen.

alter function public.session_has_aal2() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.enforce_subscription_columns_readonly() set search_path = public;

-- ══════════════════════════════════════════════════════════════════════════
-- 2. SECURITY DEFINER-triggerfuncties die ten onrechte als RPC aanroepbaar
--    zijn voor anon/authenticated
-- ══════════════════════════════════════════════════════════════════════════
-- PostgREST exposeert standaard ELKE functie in het public-schema als
-- `/rest/v1/rpc/<naam>` — ook functies die uitsluitend bedoeld zijn om als
-- trigger te vuren (`returns trigger`). Postgres weigert een trigger-functie
-- rechtstreeks aan te roepen buiten triggercontext (er is geen NEW/OLD),
-- dus dit was niet daadwerkelijk misbruikbaar — maar de linter heeft
-- gelijk dat dit onnodig extra (nutteloos) API-oppervlak is. Intrekken
-- verandert niets aan het triggergedrag zelf: een trigger vuurt op basis
-- van het recht om de INSERT/UPDATE/DELETE zelf uit te voeren op de
-- tabel, niet op basis van een EXECUTE-recht op de triggerfunctie.
--
-- Bewust NIET aangepakt: de overige ~25 SECURITY DEFINER-functies die de
-- linter ook noemt (is_org_member, can_access_patient, can_manage_org_*,
-- patient_care_context, portal_list_org_members, enz.) — die zijn wél
-- bedoeld om rechtstreeks door de app aangeroepen te worden (of als
-- RLS-helper), en controleren stuk voor stuk zelf auth.uid()/is_org_member/
-- is_platform_admin vóórdat ze iets teruggeven of wijzigen (bevestigd in
-- het veiligheidsonderzoek). Die blijven dus gewoon aanroepbaar.

revoke execute on function public.audit_row_change() from public, anon, authenticated;
revoke execute on function public.audit_stash_patient_org() from public, anon, authenticated;
revoke execute on function public.sync_settings_from_patient() from public, anon, authenticated;
revoke execute on function public.set_patient_id_from_user_id() from public, anon, authenticated;
revoke execute on function public.handle_new_user_personal_organization() from public, anon, authenticated;
revoke execute on function public.check_location_capacity() from public, anon, authenticated;
revoke execute on function public.check_member_capacity() from public, anon, authenticated;
revoke execute on function public.set_first_location_as_main() from public, anon, authenticated;

notify pgrst, 'reload schema';
