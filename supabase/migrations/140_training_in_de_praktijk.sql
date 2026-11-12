-- 140_training_in_de_praktijk.sql
-- Trainen in de praktijk (november 2026): de fysio doorloopt een schema samen
-- met de patiënt in de trainingsmodus. Die sessie telt mee als training van
-- de patiënt, dus de behandelaar mag sessies en oefeninglogs vastleggen voor
-- patiënten die hij/zij mag behandelen (zelfde regel als het herstelplan
-- bewerken: can_manage_patient_protocol_content, inclusief 2FA).

alter table public.patient_protocol_session_logs
  add column if not exists logged_by uuid references auth.users(id) on delete set null default auth.uid();

comment on column public.patient_protocol_session_logs.logged_by is
  'Wie de sessie vastlegde: de patiënt zelf, of de fysio bij een training in de praktijk';

drop policy if exists "Behandelaar logt sessie in de praktijk" on public.patient_protocol_session_logs;
create policy "Behandelaar logt sessie in de praktijk" on public.patient_protocol_session_logs
  for insert with check (public.can_manage_patient_protocol_content(patient_id));

drop policy if exists "Behandelaar logt oefeningen in de praktijk" on public.patient_protocol_exercise_logs;
create policy "Behandelaar logt oefeningen in de praktijk" on public.patient_protocol_exercise_logs
  for insert with check (public.can_manage_patient_protocol_content(patient_id));

notify pgrst, 'reload schema';
