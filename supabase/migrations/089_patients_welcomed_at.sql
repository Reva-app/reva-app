-- 089_patients_welcomed_at.sql
-- Welkomstmoment op het patiëntendashboard na afronding van de intake +
-- REVA Analyse (zie WelcomeHero) — additieve kolom, geen RLS-wijziging
-- nodig (patients UPDATE blijft can_manage_org_patients-gated; het
-- welkomstmoment zet deze vlag via een eigen SECURITY DEFINER RPC, zie
-- migratie 090, net als memberships.welcomed_at / migratie 045+071).

alter table public.patients add column if not exists welcomed_at timestamptz;

notify pgrst, 'reload schema';
