-- 121_rpc_rechten_en_audit_uitbreiding.sql
-- Week 2 van de code-review (november 2026). Drie losse fixes.

-- ══════════════════════════════════════════════════════════════════════════
-- 1. check_rate_limit alleen nog server-side
-- ══════════════════════════════════════════════════════════════════════════
-- Migratie 086 gaf anon/authenticated EXECUTE, in de veronderstelling dat
-- de bucket altijd server-side bepaald werd. Maar iedereen met de publieke
-- anon-key kon de RPC rechtstreeks aanroepen met een zelfgekozen bucket —
-- een andere gebruiker blokkeren (bv. 'delete-account:<uid>') of de tabel
-- onbeperkt laten groeien. lib/rateLimit.ts roept hem nu aan met de
-- service-role-key.
--
-- Volgorde: eerst de nieuwe app-code deployen, dan deze migratie. Andersom
-- is ook veilig (de limiter faalt open), maar dan is de rate limiting tot
-- de deploy tijdelijk uitgeschakeld.

revoke execute on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, int, int) to service_role;

-- ══════════════════════════════════════════════════════════════════════════
-- 2. copy_intake_goals_to_patient: autorisatiecheck
-- ══════════════════════════════════════════════════════════════════════════
-- Deze SECURITY DEFINER-functie (migratie 091) controleerde de aanroeper
-- niet: elke ingelogde gebruiker (en via de standaard PUBLIC-grant ook anon)
-- kon hem voor een willekeurige patiënt in een willekeurige praktijk
-- aanroepen. Nu:
--   - interne aanroep (ensure_personal_organization vanuit de
--     auth.users-trigger, auth.uid() is daar null) → toegestaan;
--   - aanroep via de API → alleen een bevoegd lid van de praktijk van die
--     patiënt (can_manage_org_patients, inclusief aal2-eis).
-- anon verliest EXECUTE, zodat "auth.uid() is null" via de API niet
-- bereikbaar is.

create or replace function public.copy_intake_goals_to_patient(p_patient_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_org_id  uuid;
  v_goal    jsonb;
begin
  select user_id, organization_id into v_user_id, v_org_id
  from public.patients where id = p_patient_id;

  if auth.uid() is not null and not public.can_manage_org_patients(v_org_id) then
    raise exception 'Geen toegang tot dit patiëntdossier.' using errcode = '42501';
  end if;

  if v_user_id is null then
    return;
  end if;

  for v_goal in
    select jsonb_array_elements(staged_goals)
    from public.patient_intakes
    where patient_id = p_patient_id
      and goals_copied_at is null
      and jsonb_array_length(staged_goals) > 0
  loop
    insert into public.goals (user_id, goal_type, icon, title, description, target_date, completed)
    values (
      v_user_id,
      'regular',
      v_goal->>'icon',
      v_goal->>'title',
      v_goal->>'description',
      nullif(v_goal->>'targetDate', '')::date,
      false
    );
  end loop;

  update public.patient_intakes
  set goals_copied_at = now()
  where patient_id = p_patient_id
    and goals_copied_at is null;
end;
$$;

revoke execute on function public.copy_intake_goals_to_patient(uuid) from public, anon;
grant execute on function public.copy_intake_goals_to_patient(uuid) to authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════════
-- 3. Audit-logging op de klinische tabellen die nog ontbraken
-- ══════════════════════════════════════════════════════════════════════════
-- patient_intakes (088) bevat klinische observaties en de analyse van de
-- therapeut; de Protocol Engine-logs (050) zijn sessie-/oefenregistraties
-- per patiënt. Alle drie hebben een eigen id en een directe patient_id,
-- dus de bestaande generieke trigger uit migratie 066 werkt ongewijzigd.

drop trigger if exists audit_patient_intakes on public.patient_intakes;
create trigger audit_patient_intakes
  after insert or update or delete on public.patient_intakes
  for each row execute function public.audit_row_change();

drop trigger if exists audit_patient_protocol_session_logs on public.patient_protocol_session_logs;
create trigger audit_patient_protocol_session_logs
  after insert or update or delete on public.patient_protocol_session_logs
  for each row execute function public.audit_row_change();

drop trigger if exists audit_patient_protocol_exercise_logs on public.patient_protocol_exercise_logs;
create trigger audit_patient_protocol_exercise_logs
  after insert or update or delete on public.patient_protocol_exercise_logs
  for each row execute function public.audit_row_change();

notify pgrst, 'reload schema';
