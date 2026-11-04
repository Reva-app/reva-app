-- Plak hieronder de inhoud van de cel uit export_beveiliging.sql (vervang deze regel) en sla op.
-- RLS appointments                             aan

-- RLS audit_log                                aan

-- RLS checkins                                 aan

-- RLS diary_workouts                           aan

-- RLS dossier_contacts                         aan

-- RLS dossier_documents                        aan

-- RLS dossier_photo_updates                    aan

-- RLS exercise_library                         aan

-- RLS goals                                    aan

-- RLS location_rooms                           aan

-- RLS locations                                aan

-- RLS medication_logs                          aan

-- RLS medication_schedule_times                aan

-- RLS medication_schedules                     aan

-- RLS membership_invites                       aan

-- RLS membership_locations                     aan

-- RLS memberships                              aan

-- RLS milestones                               aan

-- RLS notification_states                      aan

-- RLS organizations                            aan

-- RLS patient_intakes                          aan

-- RLS patient_protocol_exercise_logs           aan

-- RLS patient_protocol_phase_criteria          aan

-- RLS patient_protocol_phase_education_items   aan

-- RLS patient_protocol_phase_milestones        aan

-- RLS patient_protocol_phases                  aan

-- RLS patient_protocol_schedule_exercises      aan

-- RLS patient_protocol_schedules               aan

-- RLS patient_protocol_session_logs            aan

-- RLS patient_protocols                        aan

-- RLS patient_staff_notes                      aan

-- RLS patients                                 aan

-- RLS permissions                              aan

-- RLS platform_admins                          aan

-- RLS profiles                                 aan

-- RLS protocol_labels_legacy                   aan

-- RLS protocol_phase_criteria                  aan

-- RLS protocol_phase_education_items           aan

-- RLS protocol_phase_milestones                aan

-- RLS protocol_phase_schedule_links            aan

-- RLS protocol_phases                          aan

-- RLS protocols                                aan

-- RLS push_tokens                              aan

-- RLS rate_limit_hits                          aan

-- RLS role_permissions                         aan

-- RLS roles                                    aan

-- RLS room_reservations                        aan

-- RLS sales_leads                              aan

-- RLS schedule_library                         aan

-- RLS schedule_library_exercises               aan

-- RLS settings                                 aan

-- RLS staff_calendar_feeds                     aan

-- RLS staff_leave                              aan

-- RLS training_exercises                       aan

-- RLS training_logs                            aan

-- RLS training_schema_exercises                aan

-- RLS training_schemas                         aan

-- RLS work_schedules                           aan

create policy appointments_delete_own on public.appointments as PERMISSIVE for DELETE to public
  using (can_manage_patient(patient_id));

create policy appointments_insert_own on public.appointments as PERMISSIVE for INSERT to public
  with check (can_manage_patient(patient_id));

create policy appointments_select_accessible on public.appointments as PERMISSIVE for SELECT to public
  using (can_access_patient(patient_id));

create policy appointments_update_own on public.appointments as PERMISSIVE for UPDATE to public
  using (can_manage_patient(patient_id))
  with check (can_manage_patient(patient_id));

create policy "Platform admin leest volledige auditlog" on public.audit_log as PERMISSIVE for SELECT to public
  using (is_platform_admin());

create policy "Praktijkeigenaar leest auditlog van eigen organisatie" on public.audit_log as PERMISSIVE for SELECT to public
  using (((organization_id IS NOT NULL) AND can_view_audit_log(organization_id)));

create policy checkins_delete_own on public.checkins as PERMISSIVE for DELETE to public
  using (can_manage_patient(patient_id));

create policy checkins_insert_own on public.checkins as PERMISSIVE for INSERT to public
  with check (can_manage_patient(patient_id));

create policy checkins_select_accessible on public.checkins as PERMISSIVE for SELECT to public
  using (can_access_patient(patient_id));

create policy checkins_update_own on public.checkins as PERMISSIVE for UPDATE to public
  using (can_manage_patient(patient_id))
  with check (can_manage_patient(patient_id));

create policy diary_workouts_delete_own on public.diary_workouts as PERMISSIVE for DELETE to authenticated
  using ((auth.uid() = user_id));

create policy diary_workouts_insert_own on public.diary_workouts as PERMISSIVE for INSERT to authenticated
  with check ((auth.uid() = user_id));

create policy diary_workouts_select_own on public.diary_workouts as PERMISSIVE for SELECT to authenticated
  using ((auth.uid() = user_id));

create policy diary_workouts_update_own on public.diary_workouts as PERMISSIVE for UPDATE to authenticated
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));

create policy dossier_contacts_delete_own on public.dossier_contacts as PERMISSIVE for DELETE to public
  using (can_manage_patient(patient_id));

create policy dossier_contacts_insert_own on public.dossier_contacts as PERMISSIVE for INSERT to public
  with check (can_manage_patient(patient_id));

create policy dossier_contacts_select_accessible on public.dossier_contacts as PERMISSIVE for SELECT to public
  using (can_access_patient(patient_id));

create policy dossier_contacts_update_own on public.dossier_contacts as PERMISSIVE for UPDATE to public
  using (can_manage_patient(patient_id))
  with check (can_manage_patient(patient_id));

create policy dossier_documents_delete_own on public.dossier_documents as PERMISSIVE for DELETE to public
  using (can_manage_patient(patient_id));

create policy dossier_documents_insert_own on public.dossier_documents as PERMISSIVE for INSERT to public
  with check (can_manage_patient(patient_id));

create policy dossier_documents_select_accessible on public.dossier_documents as PERMISSIVE for SELECT to public
  using (can_access_patient(patient_id));

create policy dossier_documents_update_own on public.dossier_documents as PERMISSIVE for UPDATE to public
  using (can_manage_patient(patient_id))
  with check (can_manage_patient(patient_id));

create policy dossier_photo_updates_delete_own on public.dossier_photo_updates as PERMISSIVE for DELETE to public
  using (can_manage_patient(patient_id));

create policy dossier_photo_updates_insert_own on public.dossier_photo_updates as PERMISSIVE for INSERT to public
  with check (can_manage_patient(patient_id));

create policy dossier_photo_updates_select_accessible on public.dossier_photo_updates as PERMISSIVE for SELECT to public
  using (can_access_patient(patient_id));

create policy dossier_photo_updates_update_own on public.dossier_photo_updates as PERMISSIVE for UPDATE to public
  using (can_manage_patient(patient_id))
  with check (can_manage_patient(patient_id));

create policy "Bevoegd organisatielid beheert eigen oefeningen" on public.exercise_library as PERMISSIVE for ALL to public
  using (((scope = 'organization'::text) AND can_manage_org_protocols(organization_id)))
  with check (((scope = 'organization'::text) AND can_manage_org_protocols(organization_id)));

create policy "Organisatielid leest oefeningen (REVA + eigen organisatie)" on public.exercise_library as PERMISSIVE for SELECT to public
  using (((scope = 'reva'::text) OR is_org_member(organization_id)));

create policy "Platform admin beheert REVA-oefeningen" on public.exercise_library as PERMISSIVE for ALL to public
  using (((scope = 'reva'::text) AND is_platform_admin()))
  with check (((scope = 'reva'::text) AND is_platform_admin()));

create policy goals_delete_own on public.goals as PERMISSIVE for DELETE to public
  using (can_manage_patient(patient_id));

create policy goals_insert_own on public.goals as PERMISSIVE for INSERT to public
  with check (can_manage_patient(patient_id));

create policy goals_select_accessible on public.goals as PERMISSIVE for SELECT to public
  using (can_access_patient(patient_id));

create policy goals_update_own on public.goals as PERMISSIVE for UPDATE to public
  using (can_manage_patient(patient_id))
  with check (can_manage_patient(patient_id));

create policy "Locatiebeheerder beheert ruimtes" on public.location_rooms as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM locations l
  WHERE ((l.id = location_rooms.location_id) AND can_manage_org_locations(l.organization_id)))))
  with check ((EXISTS ( SELECT 1
   FROM locations l
  WHERE ((l.id = location_rooms.location_id) AND can_manage_org_locations(l.organization_id)))));

create policy "Organisatielid leest ruimtes van eigen locaties" on public.location_rooms as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM locations l
  WHERE ((l.id = location_rooms.location_id) AND is_org_member(l.organization_id)))));

create policy "Eigenaar/beheerder maakt vestigingen aan" on public.locations as PERMISSIVE for INSERT to public
  with check (can_manage_org_locations(organization_id));

create policy "Eigenaar/beheerder verwijdert vestigingen" on public.locations as PERMISSIVE for DELETE to public
  using (can_manage_org_locations(organization_id));

create policy "Eigenaar/beheerder werkt vestigingen bij" on public.locations as PERMISSIVE for UPDATE to public
  using (can_manage_org_locations(organization_id))
  with check (can_manage_org_locations(organization_id));

create policy "Organisatielid leest vestigingen van eigen organisatie" on public.locations as PERMISSIVE for SELECT to public
  using (is_org_member(organization_id));

create policy "Platform admin beheert vestigingen" on public.locations as PERMISSIVE for ALL to public
  using (is_platform_admin())
  with check (is_platform_admin());

create policy medication_logs_delete_own on public.medication_logs as PERMISSIVE for DELETE to public
  using (can_manage_patient(patient_id));

create policy medication_logs_insert_own on public.medication_logs as PERMISSIVE for INSERT to public
  with check (can_manage_patient(patient_id));

create policy medication_logs_select_accessible on public.medication_logs as PERMISSIVE for SELECT to public
  using (can_access_patient(patient_id));

create policy medication_logs_update_own on public.medication_logs as PERMISSIVE for UPDATE to public
  using (can_manage_patient(patient_id))
  with check (can_manage_patient(patient_id));

create policy "Users can manage own schedule times" on public.medication_schedule_times as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM medication_schedules s
  WHERE ((s.id = medication_schedule_times.schedule_id) AND (s.user_id = auth.uid())))))
  with check ((EXISTS ( SELECT 1
   FROM medication_schedules s
  WHERE ((s.id = medication_schedule_times.schedule_id) AND (s.user_id = auth.uid())))));

create policy medication_schedule_times_delete_via_owned_schedule on public.medication_schedule_times as PERMISSIVE for DELETE to authenticated
  using ((EXISTS ( SELECT 1
   FROM medication_schedules ms
  WHERE ((ms.id = medication_schedule_times.schedule_id) AND (ms.user_id = auth.uid())))));

create policy medication_schedule_times_insert_via_owned_schedule on public.medication_schedule_times as PERMISSIVE for INSERT to authenticated
  with check ((EXISTS ( SELECT 1
   FROM medication_schedules ms
  WHERE ((ms.id = medication_schedule_times.schedule_id) AND (ms.user_id = auth.uid())))));

create policy medication_schedule_times_select_via_owned_schedule on public.medication_schedule_times as PERMISSIVE for SELECT to authenticated
  using ((EXISTS ( SELECT 1
   FROM medication_schedules ms
  WHERE ((ms.id = medication_schedule_times.schedule_id) AND (ms.user_id = auth.uid())))));

create policy medication_schedule_times_update_via_owned_schedule on public.medication_schedule_times as PERMISSIVE for UPDATE to authenticated
  using ((EXISTS ( SELECT 1
   FROM medication_schedules ms
  WHERE ((ms.id = medication_schedule_times.schedule_id) AND (ms.user_id = auth.uid())))))
  with check ((EXISTS ( SELECT 1
   FROM medication_schedules ms
  WHERE ((ms.id = medication_schedule_times.schedule_id) AND (ms.user_id = auth.uid())))));

create policy medication_schedules_delete_own on public.medication_schedules as PERMISSIVE for DELETE to public
  using (can_manage_patient(patient_id));

create policy medication_schedules_insert_own on public.medication_schedules as PERMISSIVE for INSERT to public
  with check (can_manage_patient(patient_id));

create policy medication_schedules_select_accessible on public.medication_schedules as PERMISSIVE for SELECT to public
  using (can_access_patient(patient_id));

create policy medication_schedules_update_own on public.medication_schedules as PERMISSIVE for UPDATE to public
  using (can_manage_patient(patient_id))
  with check (can_manage_patient(patient_id));

create policy "Practice owner beheert uitnodigingen" on public.membership_invites as PERMISSIVE for ALL to public
  using (can_manage_org_staff(organization_id))
  with check (can_manage_org_staff(organization_id));

create policy "Organisatielid leest extra vestigingen van collega's" on public.membership_locations as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.id = membership_locations.membership_id) AND is_org_member(m.organization_id)))));

create policy "Practice owner beheert extra vestigingen" on public.membership_locations as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.id = membership_locations.membership_id) AND can_manage_org_staff(m.organization_id)))))
  with check ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.id = membership_locations.membership_id) AND can_manage_org_staff(m.organization_id)))));

create policy "Organisatielid leest memberships van eigen organisatie" on public.memberships as PERMISSIVE for SELECT to public
  using (is_org_member(organization_id));

create policy "Practice owner beheert medewerkers" on public.memberships as PERMISSIVE for ALL to public
  using (can_manage_org_staff(organization_id))
  with check (can_manage_org_staff(organization_id));

create policy milestones_delete_own on public.milestones as PERMISSIVE for DELETE to public
  using (can_manage_patient(patient_id));

create policy milestones_insert_own on public.milestones as PERMISSIVE for INSERT to public
  with check (can_manage_patient(patient_id));

create policy milestones_select_accessible on public.milestones as PERMISSIVE for SELECT to public
  using (can_access_patient(patient_id));

create policy milestones_update_own on public.milestones as PERMISSIVE for UPDATE to public
  using (can_manage_patient(patient_id))
  with check (can_manage_patient(patient_id));

create policy "Users can manage own notification state" on public.notification_states as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));

create policy "Organisatie-eigenaar/beheerder wijzigt eigen organisatie" on public.organizations as PERMISSIVE for UPDATE to public
  using (can_manage_org_branding(id))
  with check (can_manage_org_branding(id));

create policy "Organisatielid leest eigen organisatie" on public.organizations as PERMISSIVE for SELECT to public
  using (is_org_member(id));

create policy "Platform admin beheert organisaties" on public.organizations as PERMISSIVE for ALL to public
  using (is_platform_admin())
  with check (is_platform_admin());

create policy "Behandelaar leest intake van eigen organisatie" on public.patient_intakes as PERMISSIVE for SELECT to public
  using (can_view_clinical_data(organization_id));

create policy "Bevoegd lid maakt intake aan" on public.patient_intakes as PERMISSIVE for INSERT to public
  with check (can_manage_org_patients(organization_id));

create policy "Bevoegd lid verwijdert intake" on public.patient_intakes as PERMISSIVE for DELETE to public
  using (can_manage_org_patients(organization_id));

create policy "Bevoegd lid wijzigt intake" on public.patient_intakes as PERMISSIVE for UPDATE to public
  using (can_manage_org_patients(organization_id))
  with check (can_manage_org_patients(organization_id));

create policy "Patiënt logt eigen oefeningen" on public.patient_protocol_exercise_logs as PERMISSIVE for INSERT to public
  with check (can_manage_patient(patient_id));

create policy "Patiënt verwijdert eigen oefeninglogs" on public.patient_protocol_exercise_logs as PERMISSIVE for DELETE to public
  using (can_manage_patient(patient_id));

create policy "Patiënt wijzigt eigen oefeninglogs" on public.patient_protocol_exercise_logs as PERMISSIVE for UPDATE to public
  using (can_manage_patient(patient_id))
  with check (can_manage_patient(patient_id));

create policy "Toegankelijk voor patiënt en organisatielid" on public.patient_protocol_exercise_logs as PERMISSIVE for SELECT to public
  using (can_access_patient(patient_id));

create policy "Bevoegd organisatielid beheert criteria" on public.patient_protocol_phase_criteria as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM (patient_protocol_phases ph
     JOIN patient_protocols pp ON ((pp.id = ph.patient_protocol_id)))
  WHERE ((ph.id = patient_protocol_phase_criteria.phase_id) AND can_manage_patient_protocol_content(pp.patient_id)))))
  with check ((EXISTS ( SELECT 1
   FROM (patient_protocol_phases ph
     JOIN patient_protocols pp ON ((pp.id = ph.patient_protocol_id)))
  WHERE ((ph.id = patient_protocol_phase_criteria.phase_id) AND can_manage_patient_protocol_content(pp.patient_id)))));

create policy "Toegankelijk voor patiënt en organisatielid" on public.patient_protocol_phase_criteria as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM (patient_protocol_phases ph
     JOIN patient_protocols pp ON ((pp.id = ph.patient_protocol_id)))
  WHERE ((ph.id = patient_protocol_phase_criteria.phase_id) AND can_access_patient(pp.patient_id)))));

create policy "Bevoegd organisatielid beheert educatie" on public.patient_protocol_phase_education_items as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM (patient_protocol_phases ph
     JOIN patient_protocols pp ON ((pp.id = ph.patient_protocol_id)))
  WHERE ((ph.id = patient_protocol_phase_education_items.phase_id) AND can_manage_patient_protocol_content(pp.patient_id)))))
  with check ((EXISTS ( SELECT 1
   FROM (patient_protocol_phases ph
     JOIN patient_protocols pp ON ((pp.id = ph.patient_protocol_id)))
  WHERE ((ph.id = patient_protocol_phase_education_items.phase_id) AND can_manage_patient_protocol_content(pp.patient_id)))));

create policy "Toegankelijk voor patiënt en organisatielid" on public.patient_protocol_phase_education_items as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM (patient_protocol_phases ph
     JOIN patient_protocols pp ON ((pp.id = ph.patient_protocol_id)))
  WHERE ((ph.id = patient_protocol_phase_education_items.phase_id) AND can_access_patient(pp.patient_id)))));

create policy "Bevoegd organisatielid beheert mijlpalen" on public.patient_protocol_phase_milestones as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM (patient_protocol_phases ph
     JOIN patient_protocols pp ON ((pp.id = ph.patient_protocol_id)))
  WHERE ((ph.id = patient_protocol_phase_milestones.phase_id) AND can_manage_patient_protocol_content(pp.patient_id)))))
  with check ((EXISTS ( SELECT 1
   FROM (patient_protocol_phases ph
     JOIN patient_protocols pp ON ((pp.id = ph.patient_protocol_id)))
  WHERE ((ph.id = patient_protocol_phase_milestones.phase_id) AND can_manage_patient_protocol_content(pp.patient_id)))));

create policy "Toegankelijk voor patiënt en organisatielid" on public.patient_protocol_phase_milestones as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM (patient_protocol_phases ph
     JOIN patient_protocols pp ON ((pp.id = ph.patient_protocol_id)))
  WHERE ((ph.id = patient_protocol_phase_milestones.phase_id) AND can_access_patient(pp.patient_id)))));

create policy "Bevoegd organisatielid beheert fases" on public.patient_protocol_phases as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM patient_protocols pp
  WHERE ((pp.id = patient_protocol_phases.patient_protocol_id) AND can_manage_patient_protocol_content(pp.patient_id)))))
  with check ((EXISTS ( SELECT 1
   FROM patient_protocols pp
  WHERE ((pp.id = patient_protocol_phases.patient_protocol_id) AND can_manage_patient_protocol_content(pp.patient_id)))));

create policy "Toegankelijk voor patiënt en organisatielid" on public.patient_protocol_phases as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM patient_protocols pp
  WHERE ((pp.id = patient_protocol_phases.patient_protocol_id) AND can_access_patient(pp.patient_id)))));

create policy "Bevoegd organisatielid beheert schema-oefeningen" on public.patient_protocol_schedule_exercises as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM ((patient_protocol_schedules s
     JOIN patient_protocol_phases ph ON ((ph.id = s.phase_id)))
     JOIN patient_protocols pp ON ((pp.id = ph.patient_protocol_id)))
  WHERE ((s.id = patient_protocol_schedule_exercises.schedule_id) AND can_manage_patient_protocol_content(pp.patient_id)))))
  with check ((EXISTS ( SELECT 1
   FROM ((patient_protocol_schedules s
     JOIN patient_protocol_phases ph ON ((ph.id = s.phase_id)))
     JOIN patient_protocols pp ON ((pp.id = ph.patient_protocol_id)))
  WHERE ((s.id = patient_protocol_schedule_exercises.schedule_id) AND can_manage_patient_protocol_content(pp.patient_id)))));

create policy "Toegankelijk voor patiënt en organisatielid" on public.patient_protocol_schedule_exercises as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM ((patient_protocol_schedules s
     JOIN patient_protocol_phases ph ON ((ph.id = s.phase_id)))
     JOIN patient_protocols pp ON ((pp.id = ph.patient_protocol_id)))
  WHERE ((s.id = patient_protocol_schedule_exercises.schedule_id) AND can_access_patient(pp.patient_id)))));

create policy "Bevoegd organisatielid beheert schema's" on public.patient_protocol_schedules as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM (patient_protocol_phases ph
     JOIN patient_protocols pp ON ((pp.id = ph.patient_protocol_id)))
  WHERE ((ph.id = patient_protocol_schedules.phase_id) AND can_manage_patient_protocol_content(pp.patient_id)))))
  with check ((EXISTS ( SELECT 1
   FROM (patient_protocol_phases ph
     JOIN patient_protocols pp ON ((pp.id = ph.patient_protocol_id)))
  WHERE ((ph.id = patient_protocol_schedules.phase_id) AND can_manage_patient_protocol_content(pp.patient_id)))));

create policy "Toegankelijk voor patiënt en organisatielid" on public.patient_protocol_schedules as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM (patient_protocol_phases ph
     JOIN patient_protocols pp ON ((pp.id = ph.patient_protocol_id)))
  WHERE ((ph.id = patient_protocol_schedules.phase_id) AND can_access_patient(pp.patient_id)))));

create policy "Patiënt logt eigen sessies" on public.patient_protocol_session_logs as PERMISSIVE for INSERT to public
  with check (can_manage_patient(patient_id));

create policy "Patiënt verwijdert eigen sessielogs" on public.patient_protocol_session_logs as PERMISSIVE for DELETE to public
  using (can_manage_patient(patient_id));

create policy "Patiënt wijzigt eigen sessielogs" on public.patient_protocol_session_logs as PERMISSIVE for UPDATE to public
  using (can_manage_patient(patient_id))
  with check (can_manage_patient(patient_id));

create policy "Toegankelijk voor patiënt en organisatielid" on public.patient_protocol_session_logs as PERMISSIVE for SELECT to public
  using (can_access_patient(patient_id));

create policy "Bevoegd organisatielid beheert patiëntprotocol" on public.patient_protocols as PERMISSIVE for ALL to public
  using (can_manage_patient_protocol_content(patient_id))
  with check (can_manage_patient_protocol_content(patient_id));

create policy "Toegankelijk voor patiënt en organisatielid" on public.patient_protocols as PERMISSIVE for SELECT to public
  using (can_access_patient(patient_id));

create policy "Auteur bewerkt eigen notitie" on public.patient_staff_notes as PERMISSIVE for UPDATE to public
  using (((author_id = auth.uid()) AND can_view_clinical_data(organization_id)))
  with check (((author_id = auth.uid()) AND can_view_clinical_data(organization_id)));

create policy "Auteur verwijdert eigen notitie" on public.patient_staff_notes as PERMISSIVE for DELETE to public
  using (((author_id = auth.uid()) AND can_view_clinical_data(organization_id)));

create policy "Behandelaar leest notities van eigen organisatie" on public.patient_staff_notes as PERMISSIVE for SELECT to public
  using (can_view_clinical_data(organization_id));

create policy "Behandelaar voegt notitie toe" on public.patient_staff_notes as PERMISSIVE for INSERT to public
  with check ((can_view_clinical_data(organization_id) AND (author_id = auth.uid())));

create policy "Behandelaar leest patiënten van eigen organisatie" on public.patients as PERMISSIVE for SELECT to public
  using (can_view_clinical_data(organization_id));

create policy "Bevoegd organisatielid maakt patiënten aan" on public.patients as PERMISSIVE for INSERT to public
  with check (can_manage_org_patients(organization_id));

create policy "Bevoegd organisatielid verwijdert patiënten" on public.patients as PERMISSIVE for DELETE to public
  using (can_manage_org_patients(organization_id));

create policy "Bevoegd organisatielid werkt patiënten bij" on public.patients as PERMISSIVE for UPDATE to public
  using (can_manage_org_patients(organization_id))
  with check (can_manage_org_patients(organization_id));

create policy "Patiënt leest eigen patiëntrecord" on public.patients as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));

create policy "Platform admin beheert patiënten" on public.patients as PERMISSIVE for ALL to public
  using (is_platform_admin())
  with check (is_platform_admin());

create policy "Ingelogde gebruikers lezen permissies" on public.permissions as PERMISSIVE for SELECT to public
  using ((auth.role() = 'authenticated'::text));

create policy "Gebruiker leest eigen platform-admin-status" on public.platform_admins as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));

create policy "Organisatielid leest profielen van collega's en patiënten in e" on public.profiles as PERMISSIVE for SELECT to public
  using (((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.user_id = profiles.id) AND (m.status = 'active'::text) AND is_org_member(m.organization_id)))) OR (EXISTS ( SELECT 1
   FROM patients p
  WHERE ((p.user_id = profiles.id) AND is_org_member(p.organization_id))))));

create policy "Platform admin leest alle profielen" on public.profiles as PERMISSIVE for SELECT to public
  using (is_platform_admin());

create policy "Practice owner beheert profielen van eigen medewerkers" on public.profiles as PERMISSIVE for UPDATE to public
  using ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.user_id = profiles.id) AND can_manage_org_staff(m.organization_id)))))
  with check ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.user_id = profiles.id) AND can_manage_org_staff(m.organization_id)))));

create policy profiles_insert_own on public.profiles as PERMISSIVE for INSERT to authenticated
  with check ((auth.uid() = id));

create policy profiles_select_own on public.profiles as PERMISSIVE for SELECT to authenticated
  using ((auth.uid() = id));

create policy profiles_update_own on public.profiles as PERMISSIVE for UPDATE to authenticated
  using ((auth.uid() = id))
  with check ((auth.uid() = id));

create policy "Bevoegd organisatielid beheert protocollen" on public.protocol_labels_legacy as PERMISSIVE for ALL to public
  using (can_manage_org_patients(organization_id))
  with check (can_manage_org_patients(organization_id));

create policy "Organisatielid leest protocollen van eigen organisatie" on public.protocol_labels_legacy as PERMISSIVE for SELECT to public
  using (is_org_member(organization_id));

create policy "Bevoegd organisatielid beheert criteria van eigen protocollen" on public.protocol_phase_criteria as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM (protocol_phases ph
     JOIN protocols p ON ((p.id = ph.protocol_id)))
  WHERE ((ph.id = protocol_phase_criteria.phase_id) AND (p.scope = 'organization'::text) AND can_manage_org_protocols(p.organization_id)))))
  with check ((EXISTS ( SELECT 1
   FROM (protocol_phases ph
     JOIN protocols p ON ((p.id = ph.protocol_id)))
  WHERE ((ph.id = protocol_phase_criteria.phase_id) AND (p.scope = 'organization'::text) AND can_manage_org_protocols(p.organization_id)))));

create policy "Organisatielid leest criteria van toegankelijke fases" on public.protocol_phase_criteria as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM (protocol_phases ph
     JOIN protocols p ON ((p.id = ph.protocol_id)))
  WHERE ((ph.id = protocol_phase_criteria.phase_id) AND ((p.scope = 'reva'::text) OR is_org_member(p.organization_id))))));

create policy "Platform admin beheert criteria van REVA-protocollen" on public.protocol_phase_criteria as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM (protocol_phases ph
     JOIN protocols p ON ((p.id = ph.protocol_id)))
  WHERE ((ph.id = protocol_phase_criteria.phase_id) AND (p.scope = 'reva'::text) AND is_platform_admin()))))
  with check ((EXISTS ( SELECT 1
   FROM (protocol_phases ph
     JOIN protocols p ON ((p.id = ph.protocol_id)))
  WHERE ((ph.id = protocol_phase_criteria.phase_id) AND (p.scope = 'reva'::text) AND is_platform_admin()))));

create policy "Bevoegd organisatielid beheert educatie van eigen protocollen" on public.protocol_phase_education_items as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM (protocol_phases ph
     JOIN protocols p ON ((p.id = ph.protocol_id)))
  WHERE ((ph.id = protocol_phase_education_items.phase_id) AND (p.scope = 'organization'::text) AND can_manage_org_protocols(p.organization_id)))))
  with check ((EXISTS ( SELECT 1
   FROM (protocol_phases ph
     JOIN protocols p ON ((p.id = ph.protocol_id)))
  WHERE ((ph.id = protocol_phase_education_items.phase_id) AND (p.scope = 'organization'::text) AND can_manage_org_protocols(p.organization_id)))));

create policy "Organisatielid leest educatie van toegankelijke fases" on public.protocol_phase_education_items as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM (protocol_phases ph
     JOIN protocols p ON ((p.id = ph.protocol_id)))
  WHERE ((ph.id = protocol_phase_education_items.phase_id) AND ((p.scope = 'reva'::text) OR is_org_member(p.organization_id))))));

create policy "Platform admin beheert educatie van REVA-protocollen" on public.protocol_phase_education_items as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM (protocol_phases ph
     JOIN protocols p ON ((p.id = ph.protocol_id)))
  WHERE ((ph.id = protocol_phase_education_items.phase_id) AND (p.scope = 'reva'::text) AND is_platform_admin()))))
  with check ((EXISTS ( SELECT 1
   FROM (protocol_phases ph
     JOIN protocols p ON ((p.id = ph.protocol_id)))
  WHERE ((ph.id = protocol_phase_education_items.phase_id) AND (p.scope = 'reva'::text) AND is_platform_admin()))));

create policy "Bevoegd organisatielid beheert mijlpalen van eigen protocollen" on public.protocol_phase_milestones as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM (protocol_phases ph
     JOIN protocols p ON ((p.id = ph.protocol_id)))
  WHERE ((ph.id = protocol_phase_milestones.phase_id) AND (p.scope = 'organization'::text) AND can_manage_org_protocols(p.organization_id)))))
  with check ((EXISTS ( SELECT 1
   FROM (protocol_phases ph
     JOIN protocols p ON ((p.id = ph.protocol_id)))
  WHERE ((ph.id = protocol_phase_milestones.phase_id) AND (p.scope = 'organization'::text) AND can_manage_org_protocols(p.organization_id)))));

create policy "Organisatielid leest mijlpalen van toegankelijke fases" on public.protocol_phase_milestones as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM (protocol_phases ph
     JOIN protocols p ON ((p.id = ph.protocol_id)))
  WHERE ((ph.id = protocol_phase_milestones.phase_id) AND ((p.scope = 'reva'::text) OR is_org_member(p.organization_id))))));

create policy "Platform admin beheert mijlpalen van REVA-protocollen" on public.protocol_phase_milestones as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM (protocol_phases ph
     JOIN protocols p ON ((p.id = ph.protocol_id)))
  WHERE ((ph.id = protocol_phase_milestones.phase_id) AND (p.scope = 'reva'::text) AND is_platform_admin()))))
  with check ((EXISTS ( SELECT 1
   FROM (protocol_phases ph
     JOIN protocols p ON ((p.id = ph.protocol_id)))
  WHERE ((ph.id = protocol_phase_milestones.phase_id) AND (p.scope = 'reva'::text) AND is_platform_admin()))));

create policy "Bevoegd organisatielid beheert schema-koppelingen van eigen pro" on public.protocol_phase_schedule_links as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM (protocol_phases ph
     JOIN protocols p ON ((p.id = ph.protocol_id)))
  WHERE ((ph.id = protocol_phase_schedule_links.phase_id) AND (p.scope = 'organization'::text) AND can_manage_org_protocols(p.organization_id)))))
  with check ((EXISTS ( SELECT 1
   FROM (protocol_phases ph
     JOIN protocols p ON ((p.id = ph.protocol_id)))
  WHERE ((ph.id = protocol_phase_schedule_links.phase_id) AND (p.scope = 'organization'::text) AND can_manage_org_protocols(p.organization_id)))));

create policy "Organisatielid leest schema-koppelingen van toegankelijke fases" on public.protocol_phase_schedule_links as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM (protocol_phases ph
     JOIN protocols p ON ((p.id = ph.protocol_id)))
  WHERE ((ph.id = protocol_phase_schedule_links.phase_id) AND ((p.scope = 'reva'::text) OR is_org_member(p.organization_id))))));

create policy "Platform admin beheert schema-koppelingen van REVA-protocollen" on public.protocol_phase_schedule_links as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM (protocol_phases ph
     JOIN protocols p ON ((p.id = ph.protocol_id)))
  WHERE ((ph.id = protocol_phase_schedule_links.phase_id) AND (p.scope = 'reva'::text) AND is_platform_admin()))))
  with check ((EXISTS ( SELECT 1
   FROM (protocol_phases ph
     JOIN protocols p ON ((p.id = ph.protocol_id)))
  WHERE ((ph.id = protocol_phase_schedule_links.phase_id) AND (p.scope = 'reva'::text) AND is_platform_admin()))));

create policy "Bevoegd organisatielid beheert fases van eigen protocollen" on public.protocol_phases as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM protocols p
  WHERE ((p.id = protocol_phases.protocol_id) AND (p.scope = 'organization'::text) AND can_manage_org_protocols(p.organization_id)))))
  with check ((EXISTS ( SELECT 1
   FROM protocols p
  WHERE ((p.id = protocol_phases.protocol_id) AND (p.scope = 'organization'::text) AND can_manage_org_protocols(p.organization_id)))));

create policy "Organisatielid leest fases van toegankelijke protocollen" on public.protocol_phases as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM protocols p
  WHERE ((p.id = protocol_phases.protocol_id) AND ((p.scope = 'reva'::text) OR is_org_member(p.organization_id))))));

create policy "Platform admin beheert fases van REVA-protocollen" on public.protocol_phases as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM protocols p
  WHERE ((p.id = protocol_phases.protocol_id) AND (p.scope = 'reva'::text) AND is_platform_admin()))))
  with check ((EXISTS ( SELECT 1
   FROM protocols p
  WHERE ((p.id = protocol_phases.protocol_id) AND (p.scope = 'reva'::text) AND is_platform_admin()))));

create policy "Bevoegd organisatielid beheert eigen protocollen" on public.protocols as PERMISSIVE for ALL to public
  using (((scope = 'organization'::text) AND can_manage_org_protocols(organization_id)))
  with check (((scope = 'organization'::text) AND can_manage_org_protocols(organization_id)));

create policy "Organisatielid leest protocollen (REVA + eigen organisatie)" on public.protocols as PERMISSIVE for SELECT to public
  using (((scope = 'reva'::text) OR is_org_member(organization_id)));

create policy "Platform admin beheert REVA-protocollen" on public.protocols as PERMISSIVE for ALL to public
  using (((scope = 'reva'::text) AND is_platform_admin()))
  with check (((scope = 'reva'::text) AND is_platform_admin()));

create policy "Gebruiker beheert eigen tokens" on public.push_tokens as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));

create policy "Ingelogde gebruikers lezen role_permissions" on public.role_permissions as PERMISSIVE for SELECT to public
  using ((auth.role() = 'authenticated'::text));

create policy "Ingelogde gebruikers lezen rollen" on public.roles as PERMISSIVE for SELECT to public
  using ((auth.role() = 'authenticated'::text));

create policy "Organisatielid beheert reserveringen van eigen locaties" on public.room_reservations as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM (location_rooms r
     JOIN locations l ON ((l.id = r.location_id)))
  WHERE ((r.id = room_reservations.room_id) AND is_org_member(l.organization_id)))))
  with check ((EXISTS ( SELECT 1
   FROM (location_rooms r
     JOIN locations l ON ((l.id = r.location_id)))
  WHERE ((r.id = room_reservations.room_id) AND is_org_member(l.organization_id)))));

create policy "Organisatielid leest reserveringen van eigen locaties" on public.room_reservations as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM (location_rooms r
     JOIN locations l ON ((l.id = r.location_id)))
  WHERE ((r.id = room_reservations.room_id) AND is_org_member(l.organization_id)))));

create policy "Platform admin beheert sales pipeline" on public.sales_leads as PERMISSIVE for ALL to public
  using (is_platform_admin())
  with check (is_platform_admin());

create policy "Bevoegd organisatielid beheert eigen schema's" on public.schedule_library as PERMISSIVE for ALL to public
  using (((scope = 'organization'::text) AND can_manage_org_protocols(organization_id)))
  with check (((scope = 'organization'::text) AND can_manage_org_protocols(organization_id)));

create policy "Organisatielid leest schema's (REVA + eigen organisatie)" on public.schedule_library as PERMISSIVE for SELECT to public
  using (((scope = 'reva'::text) OR is_org_member(organization_id)));

create policy "Platform admin beheert REVA-schema's" on public.schedule_library as PERMISSIVE for ALL to public
  using (((scope = 'reva'::text) AND is_platform_admin()))
  with check (((scope = 'reva'::text) AND is_platform_admin()));

create policy "Bevoegd organisatielid beheert schema-oefeningen van eigen sche" on public.schedule_library_exercises as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM schedule_library sl
  WHERE ((sl.id = schedule_library_exercises.schedule_id) AND (sl.scope = 'organization'::text) AND can_manage_org_protocols(sl.organization_id)))))
  with check ((EXISTS ( SELECT 1
   FROM schedule_library sl
  WHERE ((sl.id = schedule_library_exercises.schedule_id) AND (sl.scope = 'organization'::text) AND can_manage_org_protocols(sl.organization_id)))));

create policy "Organisatielid leest schema-oefeningen" on public.schedule_library_exercises as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM schedule_library sl
  WHERE ((sl.id = schedule_library_exercises.schedule_id) AND ((sl.scope = 'reva'::text) OR is_org_member(sl.organization_id))))));

create policy "Platform admin beheert schema-oefeningen van REVA-schema's" on public.schedule_library_exercises as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM schedule_library sl
  WHERE ((sl.id = schedule_library_exercises.schedule_id) AND (sl.scope = 'reva'::text) AND is_platform_admin()))))
  with check ((EXISTS ( SELECT 1
   FROM schedule_library sl
  WHERE ((sl.id = schedule_library_exercises.schedule_id) AND (sl.scope = 'reva'::text) AND is_platform_admin()))));

create policy settings_delete_own on public.settings as PERMISSIVE for DELETE to authenticated
  using ((auth.uid() = user_id));

create policy settings_insert_own on public.settings as PERMISSIVE for INSERT to authenticated
  with check ((auth.uid() = user_id));

create policy settings_select_own on public.settings as PERMISSIVE for SELECT to authenticated
  using ((auth.uid() = user_id));

create policy settings_update_own on public.settings as PERMISSIVE for UPDATE to authenticated
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));

create policy "Practice owner of medewerker zelf beheert agenda-koppeling" on public.staff_calendar_feeds as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.id = staff_calendar_feeds.membership_id) AND (can_manage_org_staff(m.organization_id) OR (m.user_id = auth.uid()))))))
  with check ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.id = staff_calendar_feeds.membership_id) AND (can_manage_org_staff(m.organization_id) OR (m.user_id = auth.uid()))))));

create policy "Organisatielid leest verlof van collega's" on public.staff_leave as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.id = staff_leave.membership_id) AND is_org_member(m.organization_id)))));

create policy "Practice owner beheert verlof" on public.staff_leave as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.id = staff_leave.membership_id) AND can_manage_org_staff(m.organization_id)))))
  with check ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.id = staff_leave.membership_id) AND can_manage_org_staff(m.organization_id)))));

create policy training_exercises_delete_own on public.training_exercises as PERMISSIVE for DELETE to public
  using (can_manage_patient(patient_id));

create policy training_exercises_insert_own on public.training_exercises as PERMISSIVE for INSERT to public
  with check (can_manage_patient(patient_id));

create policy training_exercises_select_accessible on public.training_exercises as PERMISSIVE for SELECT to public
  using (can_access_patient(patient_id));

create policy training_exercises_update_own on public.training_exercises as PERMISSIVE for UPDATE to public
  using (can_manage_patient(patient_id))
  with check (can_manage_patient(patient_id));

create policy training_logs_delete_own on public.training_logs as PERMISSIVE for DELETE to public
  using (can_manage_patient(patient_id));

create policy training_logs_insert_own on public.training_logs as PERMISSIVE for INSERT to public
  with check (can_manage_patient(patient_id));

create policy training_logs_select_accessible on public.training_logs as PERMISSIVE for SELECT to public
  using (can_access_patient(patient_id));

create policy training_logs_update_own on public.training_logs as PERMISSIVE for UPDATE to public
  using (can_manage_patient(patient_id))
  with check (can_manage_patient(patient_id));

create policy training_schema_exercises_delete_own on public.training_schema_exercises as PERMISSIVE for DELETE to public
  using ((EXISTS ( SELECT 1
   FROM training_schemas s
  WHERE ((s.id = training_schema_exercises.schema_id) AND can_manage_patient(s.patient_id)))));

create policy training_schema_exercises_delete_via_owned_schema on public.training_schema_exercises as PERMISSIVE for DELETE to authenticated
  using ((EXISTS ( SELECT 1
   FROM training_schemas ts
  WHERE ((ts.id = training_schema_exercises.schema_id) AND (ts.user_id = auth.uid())))));

create policy training_schema_exercises_insert_via_owned_schema on public.training_schema_exercises as PERMISSIVE for INSERT to authenticated
  with check ((EXISTS ( SELECT 1
   FROM training_schemas ts
  WHERE ((ts.id = training_schema_exercises.schema_id) AND (ts.user_id = auth.uid())))));

create policy training_schema_exercises_insert_own on public.training_schema_exercises as PERMISSIVE for INSERT to public
  with check ((EXISTS ( SELECT 1
   FROM training_schemas s
  WHERE ((s.id = training_schema_exercises.schema_id) AND can_manage_patient(s.patient_id)))));

create policy training_schema_exercises_select_accessible on public.training_schema_exercises as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM training_schemas s
  WHERE ((s.id = training_schema_exercises.schema_id) AND can_access_patient(s.patient_id)))));

create policy training_schema_exercises_select_via_owned_schema on public.training_schema_exercises as PERMISSIVE for SELECT to authenticated
  using ((EXISTS ( SELECT 1
   FROM training_schemas ts
  WHERE ((ts.id = training_schema_exercises.schema_id) AND (ts.user_id = auth.uid())))));

create policy training_schema_exercises_update_own on public.training_schema_exercises as PERMISSIVE for UPDATE to public
  using ((EXISTS ( SELECT 1
   FROM training_schemas s
  WHERE ((s.id = training_schema_exercises.schema_id) AND can_manage_patient(s.patient_id)))))
  with check ((EXISTS ( SELECT 1
   FROM training_schemas s
  WHERE ((s.id = training_schema_exercises.schema_id) AND can_manage_patient(s.patient_id)))));

create policy training_schema_exercises_update_via_owned_schema on public.training_schema_exercises as PERMISSIVE for UPDATE to authenticated
  using ((EXISTS ( SELECT 1
   FROM training_schemas ts
  WHERE ((ts.id = training_schema_exercises.schema_id) AND (ts.user_id = auth.uid())))))
  with check ((EXISTS ( SELECT 1
   FROM training_schemas ts
  WHERE ((ts.id = training_schema_exercises.schema_id) AND (ts.user_id = auth.uid())))));

create policy training_schemas_delete_own on public.training_schemas as PERMISSIVE for DELETE to public
  using (can_manage_patient(patient_id));

create policy training_schemas_insert_own on public.training_schemas as PERMISSIVE for INSERT to public
  with check (can_manage_patient(patient_id));

create policy training_schemas_select_accessible on public.training_schemas as PERMISSIVE for SELECT to public
  using (can_access_patient(patient_id));

create policy training_schemas_update_own on public.training_schemas as PERMISSIVE for UPDATE to public
  using (can_manage_patient(patient_id))
  with check (can_manage_patient(patient_id));

create policy "Organisatielid leest werkuren van collega's" on public.work_schedules as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.id = work_schedules.membership_id) AND is_org_member(m.organization_id)))));

create policy "Practice owner of medewerker zelf beheert werkuren" on public.work_schedules as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.id = work_schedules.membership_id) AND (can_manage_org_staff(m.organization_id) OR (m.user_id = auth.uid()))))))
  with check ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.id = work_schedules.membership_id) AND (can_manage_org_staff(m.organization_id) OR (m.user_id = auth.uid()))))));

create policy "Gebruiker beheert eigen profielfoto" on storage.objects as PERMISSIVE for ALL to public
  using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)))
  with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

create policy "Organisatie-eigenaar/beheerder beheert eigen logo" on storage.objects as PERMISSIVE for ALL to public
  using (((bucket_id = 'organization-logos'::text) AND can_manage_org_branding(((storage.foldername(name))[1])::uuid)))
  with check (((bucket_id = 'organization-logos'::text) AND can_manage_org_branding(((storage.foldername(name))[1])::uuid)));

create policy "Organisatieleden en patiënten lezen organisatielogo" on storage.objects as PERMISSIVE for SELECT to public
  using (((bucket_id = 'organization-logos'::text) AND (is_org_member(((storage.foldername(name))[1])::uuid) OR (EXISTS ( SELECT 1
   FROM patients p
  WHERE ((p.organization_id = ((storage.foldername(objects.name))[1])::uuid) AND (p.user_id = auth.uid())))))));

create policy "Platform admin beheert organisatielogo's" on storage.objects as PERMISSIVE for ALL to public
  using (((bucket_id = 'organization-logos'::text) AND is_platform_admin()))
  with check (((bucket_id = 'organization-logos'::text) AND is_platform_admin()));

create policy "Profielfoto leesbaar voor wie het profiel mag zien" on storage.objects as PERMISSIVE for SELECT to authenticated
  using (((bucket_id = 'avatars'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id)::text = (storage.foldername(objects.name))[1])))));

create policy dossier_docs_delete_own on storage.objects as PERMISSIVE for DELETE to authenticated
  using (((bucket_id = 'dossier-documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

create policy dossier_docs_insert_own on storage.objects as PERMISSIVE for INSERT to authenticated
  with check (((bucket_id = 'dossier-documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

create policy dossier_docs_select_own on storage.objects as PERMISSIVE for SELECT to authenticated
  using (((bucket_id = 'dossier-documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

create policy dossier_photos_delete_own on storage.objects as PERMISSIVE for DELETE to authenticated
  using (((bucket_id = 'dossier-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

create policy dossier_photos_insert_own on storage.objects as PERMISSIVE for INSERT to authenticated
  with check (((bucket_id = 'dossier-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

create policy dossier_photos_select_org_staff on storage.objects as PERMISSIVE for SELECT to authenticated
  using (((bucket_id = 'dossier-photos'::text) AND (EXISTS ( SELECT 1
   FROM patients p
  WHERE (((p.user_id)::text = (storage.foldername(objects.name))[1]) AND can_access_patient(p.id))))));

create policy dossier_photos_select_own on storage.objects as PERMISSIVE for SELECT to authenticated
  using (((bucket_id = 'dossier-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

create policy protocol_media_manage_org on storage.objects as PERMISSIVE for ALL to authenticated
  using (((bucket_id = 'protocol-media'::text) AND
CASE
    WHEN ((storage.foldername(name))[1] = 'reva'::text) THEN false
    ELSE can_manage_org_protocols(((storage.foldername(name))[1])::uuid)
END))
  with check (((bucket_id = 'protocol-media'::text) AND
CASE
    WHEN ((storage.foldername(name))[1] = 'reva'::text) THEN false
    ELSE can_manage_org_protocols(((storage.foldername(name))[1])::uuid)
END));

create policy protocol_media_manage_reva on storage.objects as PERMISSIVE for ALL to authenticated
  using (((bucket_id = 'protocol-media'::text) AND ((storage.foldername(name))[1] = 'reva'::text) AND is_platform_admin()))
  with check (((bucket_id = 'protocol-media'::text) AND ((storage.foldername(name))[1] = 'reva'::text) AND is_platform_admin()));

create policy protocol_media_select_org on storage.objects as PERMISSIVE for SELECT to authenticated
  using (((bucket_id = 'protocol-media'::text) AND
CASE
    WHEN ((storage.foldername(name))[1] = 'reva'::text) THEN false
    ELSE is_org_member(((storage.foldername(name))[1])::uuid)
END));

create policy protocol_media_select_patient_assigned on storage.objects as PERMISSIVE for SELECT to authenticated
  using (((bucket_id = 'protocol-media'::text) AND ((EXISTS ( SELECT 1
   FROM ((((patient_protocol_schedule_exercises se
     JOIN patient_protocol_schedules s ON ((s.id = se.schedule_id)))
     JOIN patient_protocol_phases ph ON ((ph.id = s.phase_id)))
     JOIN patient_protocols pp ON ((pp.id = ph.patient_protocol_id)))
     JOIN patients p ON ((p.id = pp.patient_id)))
  WHERE ((se.media_path = objects.name) AND (p.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (((patient_protocol_phase_education_items ei
     JOIN patient_protocol_phases ph ON ((ph.id = ei.phase_id)))
     JOIN patient_protocols pp ON ((pp.id = ph.patient_protocol_id)))
     JOIN patients p ON ((p.id = pp.patient_id)))
  WHERE ((ei.media_path = objects.name) AND (p.user_id = auth.uid())))))));

create policy protocol_media_select_reva on storage.objects as PERMISSIVE for SELECT to authenticated
  using (((bucket_id = 'protocol-media'::text) AND ((storage.foldername(name))[1] = 'reva'::text)));

-- FN admin_list_org_members(org_id uuid)                     anon: JA   authenticated: JA   search_path: search_path=public

-- FN admin_org_last_activity()                               anon: JA   authenticated: JA   search_path: search_path=public

-- FN admin_recovery_duration_stats()                         anon: JA   authenticated: JA   search_path: search_path=public

-- FN assign_protocol_to_patient(p_patient_id uuid, p_protocol_id uuid) anon: JA   authenticated: JA   search_path: search_path=public

-- FN audit_row_change()                                      anon: nee  authenticated: nee  search_path: search_path=public

-- FN audit_stash_patient_org()                               anon: nee  authenticated: nee  search_path: search_path=public

-- FN can_access_patient(p_patient_id uuid)                   anon: JA   authenticated: JA   search_path: search_path=public

-- FN can_manage_org_branding(org_id uuid)                    anon: JA   authenticated: JA   search_path: search_path=public

-- FN can_manage_org_locations(org_id uuid)                   anon: JA   authenticated: JA   search_path: search_path=public

-- FN can_manage_org_patients(org_id uuid)                    anon: JA   authenticated: JA   search_path: search_path=public

-- FN can_manage_org_protocols(org_id uuid)                   anon: JA   authenticated: JA   search_path: search_path=public

-- FN can_manage_org_staff(org_id uuid)                       anon: JA   authenticated: JA   search_path: search_path=public

-- FN can_manage_patient(p_patient_id uuid)                   anon: JA   authenticated: JA   search_path: search_path=public

-- FN can_manage_patient_protocol_content(p_patient_id uuid)  anon: JA   authenticated: JA   search_path: search_path=public

-- FN can_view_audit_log(org_id uuid)                         anon: JA   authenticated: JA   search_path: search_path=public

-- FN can_view_clinical_data(org_id uuid)                     anon: nee  authenticated: JA   search_path: search_path=public

-- FN can_view_org_analytics(org_id uuid)                     anon: JA   authenticated: JA   search_path: search_path=public

-- FN check_location_capacity()                               anon: nee  authenticated: nee  search_path: search_path=public

-- FN check_member_capacity()                                 anon: nee  authenticated: nee  search_path: search_path=public

-- FN check_rate_limit(p_bucket text, p_max_hits integer, p_window_seconds integer) anon: nee  authenticated: nee  search_path: search_path=public

-- FN copy_intake_goals_to_patient(p_patient_id uuid)         anon: nee  authenticated: JA   search_path: search_path=public

-- FN delete_own_patient_dossier(p_user_id uuid)              anon: nee  authenticated: nee  search_path: search_path=public

-- FN delete_patient_dossier(p_patient_id uuid, p_actor_id uuid) anon: nee  authenticated: nee  search_path: search_path=public

-- FN ensure_personal_organization(p_user_id uuid)            anon: nee  authenticated: nee  search_path: search_path=public

-- FN guard_organization_columns()                            anon: nee  authenticated: nee  search_path: search_path=public

-- FN handle_new_user_personal_organization()                 anon: nee  authenticated: nee  search_path: search_path=public

-- FN is_org_member(org_id uuid)                              anon: JA   authenticated: JA   search_path: search_path=public

-- FN is_platform_admin()                                     anon: JA   authenticated: JA   search_path: search_path=public

-- FN load_own_intake_body_side()                             anon: JA   authenticated: JA   search_path: search_path=public

-- FN load_own_intake_summary()                               anon: JA   authenticated: JA   search_path: search_path=public

-- FN log_patients_export(p_organization_id uuid, p_count integer) anon: JA   authenticated: JA   search_path: search_path=public

-- FN mark_own_membership_welcomed(p_membership_id uuid)      anon: JA   authenticated: JA   search_path: search_path=public

-- FN mark_own_patient_welcomed(p_patient_id uuid)            anon: JA   authenticated: JA   search_path: search_path=public

-- FN patient_care_context()                                  anon: JA   authenticated: JA   search_path: search_path=public

-- FN patient_organization_branding()                         anon: JA   authenticated: JA   search_path: search_path=public

-- FN portal_find_user_by_email(p_email text)                 anon: JA   authenticated: JA   search_path: search_path=public

-- FN portal_list_org_members(org_id uuid)                    anon: JA   authenticated: JA   search_path: search_path=public

-- FN portal_org_activity_summary(p_organization_id uuid)     anon: JA   authenticated: JA   search_path: search_path=public

-- FN portal_org_agenda(p_organization_id uuid, p_from date, p_to date) anon: nee  authenticated: JA   search_path: search_path=public

-- FN portal_org_usage_stats(p_organization_id uuid, p_period_days integer) anon: JA   authenticated: JA   search_path: search_path=public

-- FN portal_patient_count(p_organization_id uuid)            anon: nee  authenticated: JA   search_path: search_path=public

-- FN portal_patient_directory(p_organization_id uuid)        anon: nee  authenticated: JA   search_path: search_path=public

-- FN portal_quality_stats(p_organization_id uuid, p_period_days integer) anon: JA   authenticated: JA   search_path: search_path=public

-- FN portal_recovery_duration_stats(p_organization_id uuid)  anon: JA   authenticated: JA   search_path: search_path=public

-- FN portal_room_occupancy_stats(p_organization_id uuid, p_period_days integer) anon: JA   authenticated: JA   search_path: search_path=public

-- FN portal_therapist_workload(p_organization_id uuid)       anon: JA   authenticated: JA   search_path: search_path=public

-- FN rls_auto_enable()                                       anon: JA   authenticated: JA   search_path: search_path=pg_catalog

-- FN set_first_location_as_main()                            anon: nee  authenticated: nee  search_path: search_path=public

-- FN set_main_location(p_location_id uuid)                   anon: JA   authenticated: JA   search_path: search_path=public

-- FN set_patient_id_from_user_id()                           anon: nee  authenticated: nee  search_path: search_path=public

-- FN sync_settings_from_patient()                            anon: nee  authenticated: nee  search_path: search_path=public

-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.admin_list_org_members(org_id uuid)
 RETURNS TABLE(user_id uuid, full_name text, email text, role_key text, role_name text, location_id uuid, location_name text, membership_status text, last_sign_in_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    m.user_id,
    p.full_name,
    p.email,
    r.key,
    r.name,
    m.location_id,
    l.name,
    m.status,
    u.last_sign_in_at
  from public.memberships m
  join public.roles r on r.id = m.role_id
  left join public.profiles p on p.id = m.user_id
  left join public.locations l on l.id = m.location_id
  left join auth.users u on u.id = m.user_id
  where m.organization_id = org_id
    and public.is_platform_admin()
  order by r.scope, r.key, p.full_name;
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.admin_org_last_activity()
 RETURNS TABLE(organization_id uuid, last_sign_in_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select m.organization_id, max(u.last_sign_in_at)
  from public.memberships m
  join auth.users u on u.id = m.user_id
  where public.is_platform_admin()
  group by m.organization_id;
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.admin_recovery_duration_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_result jsonb;
begin
  if not public.is_platform_admin() then
    return jsonb_build_object('totalDischarged', 0, 'avgDurationDays', null, 'byInjuryCategory', '[]'::jsonb, 'patientsPerYear', '[]'::jsonb);
  end if;

  with latest_protocol as (
    select distinct on (pp.patient_id) pp.patient_id, pp.injury_category, pp.assigned_at
    from public.patient_protocols pp
    order by pp.patient_id, pp.assigned_at desc
  ),
  discharged as (
    select p.id, p.discharge_outcome, lp.injury_category,
      extract(epoch from (p.discharged_at - lp.assigned_at)) / 86400.0 as duration_days
    from public.patients p
    join latest_protocol lp on lp.patient_id = p.id
    where p.discharged_at is not null
  ),
  by_category as (
    select injury_category, count(*) as cnt, avg(duration_days) as avg_days
    from discharged
    where injury_category is not null
    group by injury_category
  ),
  by_year as (
    select extract(year from created_at)::int as yr, count(*) as cnt
    from public.patients
    group by 1
    order by 1 desc
    limit 6
  )
  select jsonb_build_object(
    'totalDischarged', (select count(*) from discharged),
    'avgDurationDays', (select round(avg(duration_days), 1) from discharged),
    'byInjuryCategory', coalesce((
      select jsonb_agg(jsonb_build_object('injuryCategory', injury_category, 'count', cnt, 'avgDurationDays', round(avg_days, 1)) order by cnt desc)
      from by_category
    ), '[]'::jsonb),
    'patientsPerYear', coalesce((
      select jsonb_agg(jsonb_build_object('year', yr, 'count', cnt) order by yr desc)
      from by_year
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.assign_protocol_to_patient(p_patient_id uuid, p_protocol_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid;
  v_protocol_scope text;
  v_protocol_org_id uuid;
  v_protocol_name text;
  v_protocol_injury_category text;
  v_patient_protocol_id uuid;
  v_phase record;
  v_new_phase_id uuid;
  v_is_first_phase boolean := true;
  v_link record;
  v_new_schedule_id uuid;
  v_schedule_exercise record;
  v_criterion record;
  v_milestone record;
  v_education record;
begin
  select organization_id into v_org_id from public.patients where id = p_patient_id;
  if v_org_id is null then
    raise exception 'Patiënt niet gevonden';
  end if;

  if not public.can_manage_org_patients(v_org_id) then
    raise exception 'Geen toegang';
  end if;

  select scope, organization_id, name, injury_category
    into v_protocol_scope, v_protocol_org_id, v_protocol_name, v_protocol_injury_category
  from public.protocols
  where id = p_protocol_id and not archived;

  if v_protocol_name is null then
    raise exception 'Herstelplan niet gevonden of gearchiveerd';
  end if;
  if not (v_protocol_scope = 'reva' or v_protocol_org_id = v_org_id) then
    raise exception 'Herstelplan hoort niet bij deze organisatie';
  end if;

  update public.patient_protocols
  set status = 'archived', updated_at = now()
  where patient_id = p_patient_id and status in ('active', 'paused');

  insert into public.patient_protocols
    (patient_id, source_protocol_id, name, injury_category, status, assigned_by, assigned_at)
  values
    (p_patient_id, p_protocol_id, v_protocol_name, v_protocol_injury_category, 'active', auth.uid(), now())
  returning id into v_patient_protocol_id;

  for v_phase in
    select * from public.protocol_phases where protocol_id = p_protocol_id order by sort_order asc
  loop
    insert into public.patient_protocol_phases
      (patient_protocol_id, source_phase_id, sort_order, name, description, therapist_notes, status, started_at, forbidden_activities, week_range_label)
    values
      (v_patient_protocol_id, v_phase.id, v_phase.sort_order, v_phase.name, v_phase.description, v_phase.therapist_notes,
       case when v_is_first_phase then 'active' else 'not_started' end,
       case when v_is_first_phase then now() else null end,
       v_phase.forbidden_activities, v_phase.week_range_label)
    returning id into v_new_phase_id;

    v_is_first_phase := false;

    for v_criterion in
      select * from public.protocol_phase_criteria where phase_id = v_phase.id order by sort_order asc
    loop
      insert into public.patient_protocol_phase_criteria (phase_id, source_criterion_id, description, sort_order)
      values (v_new_phase_id, v_criterion.id, v_criterion.description, v_criterion.sort_order);
    end loop;

    for v_milestone in
      select * from public.protocol_phase_milestones where phase_id = v_phase.id order by sort_order asc
    loop
      insert into public.patient_protocol_phase_milestones (phase_id, source_milestone_id, title, sort_order)
      values (v_new_phase_id, v_milestone.id, v_milestone.title, v_milestone.sort_order);
    end loop;

    for v_education in
      select * from public.protocol_phase_education_items where phase_id = v_phase.id order by sort_order asc
    loop
      insert into public.patient_protocol_phase_education_items
        (phase_id, source_item_id, title, body, media_path, media_type, sort_order)
      values
        (v_new_phase_id, v_education.id, v_education.title, v_education.body, v_education.media_path, v_education.media_type, v_education.sort_order);
    end loop;

    for v_link in
      select spsl.frequency_per_week, spsl.sort_order, sl.id as schedule_library_id, sl.title
      from public.protocol_phase_schedule_links spsl
      join public.schedule_library sl on sl.id = spsl.schedule_id
      where spsl.phase_id = v_phase.id
      order by spsl.sort_order asc
    loop
      insert into public.patient_protocol_schedules (phase_id, source_schedule_id, title, frequency_per_week, sort_order)
      values (v_new_phase_id, v_link.schedule_library_id, v_link.title, v_link.frequency_per_week, v_link.sort_order)
      returning id into v_new_schedule_id;

      for v_schedule_exercise in
        select
          se.exercise_id, se.sort_order, se.prescribed_sets, se.prescribed_reps,
          se.prescribed_duration_seconds, se.prescribed_load_text, se.prescription_note,
          e.title as ex_title, e.description as ex_description, e.instructions as ex_instructions,
          e.media_path as ex_media_path, e.media_type as ex_media_type
        from public.schedule_library_exercises se
        join public.exercise_library e on e.id = se.exercise_id
        where se.schedule_id = v_link.schedule_library_id
        order by se.sort_order asc
      loop
        insert into public.patient_protocol_schedule_exercises
          (schedule_id, source_exercise_id, sort_order, title, description, instructions, media_path, media_type,
           prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text, prescription_note)
        values
          (v_new_schedule_id, v_schedule_exercise.exercise_id, v_schedule_exercise.sort_order,
           v_schedule_exercise.ex_title, v_schedule_exercise.ex_description, v_schedule_exercise.ex_instructions,
           v_schedule_exercise.ex_media_path, v_schedule_exercise.ex_media_type,
           v_schedule_exercise.prescribed_sets, v_schedule_exercise.prescribed_reps, v_schedule_exercise.prescribed_duration_seconds,
           v_schedule_exercise.prescribed_load_text, v_schedule_exercise.prescription_note);
      end loop;
    end loop;
  end loop;

  return v_patient_protocol_id;
end;
$function$


-- uitvoeren door anon: nee, authenticated: nee
CREATE OR REPLACE FUNCTION public.audit_row_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_record_id       uuid;
  v_patient_id      uuid;
  v_organization_id uuid;
begin
  v_record_id := case when TG_OP = 'DELETE' then OLD.id else NEW.id end;

  if TG_TABLE_NAME = 'patients' then
    v_patient_id := v_record_id;
    v_organization_id := coalesce(NEW.organization_id, OLD.organization_id);
  else
    v_patient_id := coalesce(NEW.patient_id, OLD.patient_id);
    select organization_id into v_organization_id from public.patients where id = v_patient_id;

    if v_organization_id is null and to_regclass('pg_temp.audit_org_stash') is not null then
      select organization_id into v_organization_id from pg_temp.audit_org_stash where patient_id = v_patient_id;
    end if;
  end if;

  insert into public.audit_log (table_name, record_id, patient_id, organization_id, actor_id, action, old_data, new_data)
  values (
    TG_TABLE_NAME, v_record_id, v_patient_id, v_organization_id,
    coalesce(auth.uid(), nullif(current_setting('app.audit_actor_id', true), '')::uuid),
    lower(TG_OP),
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(OLD) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(NEW) else null end
  );

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$function$


-- uitvoeren door anon: nee, authenticated: nee
CREATE OR REPLACE FUNCTION public.audit_stash_patient_org()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  create temp table if not exists audit_org_stash (
    patient_id uuid primary key,
    organization_id uuid
  ) on commit drop;

  insert into audit_org_stash (patient_id, organization_id)
  values (OLD.id, OLD.organization_id)
  on conflict (patient_id) do nothing;

  return OLD;
end;
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.can_access_patient(p_patient_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.patients p
    where p.id = p_patient_id
      and (
        p.user_id = auth.uid()
        or public.can_view_clinical_data(p.organization_id)
      )
  );
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.can_manage_org_branding(org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    public.is_platform_admin()
    or (
      exists (
        select 1
        from public.memberships m
        join public.roles r on r.id = m.role_id
        where m.organization_id = org_id
          and m.user_id = auth.uid()
          and m.status = 'active'
          and r.key = 'organization_owner'
      )
      and public.session_has_aal2()
    );
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.can_manage_org_locations(org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    public.is_platform_admin()
    or (
      exists (
        select 1
        from public.memberships m
        join public.roles r on r.id = m.role_id
        where m.organization_id = org_id
          and m.user_id = auth.uid()
          and m.status = 'active'
          and r.key = 'organization_owner'
      )
      and public.session_has_aal2()
    );
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.can_manage_org_patients(org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    public.is_platform_admin()
    or (
      exists (
        select 1
        from public.memberships m
        join public.roles r on r.id = m.role_id
        where m.organization_id = org_id
          and m.user_id = auth.uid()
          and m.status = 'active'
          and r.key in ('organization_owner', 'therapist')
      )
      and public.session_has_aal2()
    );
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.can_manage_org_protocols(org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    public.is_platform_admin()
    or (
      exists (
        select 1
        from public.memberships m
        join public.roles r on r.id = m.role_id
        where m.organization_id = org_id
          and m.user_id = auth.uid()
          and m.status = 'active'
          and r.key in ('organization_owner', 'therapist')
      )
      and public.session_has_aal2()
    );
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.can_manage_org_staff(org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    public.is_platform_admin()
    or (
      exists (
        select 1
        from public.memberships m
        join public.roles r on r.id = m.role_id
        where m.organization_id = org_id
          and m.user_id = auth.uid()
          and m.status = 'active'
          and r.key = 'organization_owner'
      )
      and public.session_has_aal2()
    );
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.can_manage_patient(p_patient_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.patients p
    where p.id = p_patient_id
      and (p.user_id = auth.uid() or public.is_platform_admin())
  );
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.can_manage_patient_protocol_content(p_patient_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    public.is_platform_admin()
    or (
      exists (
        select 1
        from public.patients p
        join public.memberships m on m.organization_id = p.organization_id
        join public.roles r on r.id = m.role_id
        where p.id = p_patient_id
          and m.user_id = auth.uid()
          and m.status = 'active'
          and r.key in ('organization_owner', 'therapist')
      )
      and public.session_has_aal2()
    );
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.can_view_audit_log(org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    public.is_platform_admin()
    or (
      exists (
        select 1
        from public.memberships m
        join public.roles r on r.id = m.role_id
        where m.organization_id = org_id
          and m.user_id = auth.uid()
          and m.status = 'active'
          and r.key = 'organization_owner'
      )
      and public.session_has_aal2()
    );
$function$


-- uitvoeren door anon: nee, authenticated: JA
CREATE OR REPLACE FUNCTION public.can_view_clinical_data(org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    public.is_platform_admin()
    or (
      exists (
        select 1
        from public.memberships m
        join public.roles r on r.id = m.role_id
        where m.organization_id = org_id
          and m.user_id = auth.uid()
          and m.status = 'active'
          and r.key in ('organization_owner', 'therapist')
      )
      and public.session_has_aal2()
    );
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.can_view_org_analytics(org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    public.is_platform_admin()
    or (
      exists (
        select 1
        from public.memberships m
        join public.roles r on r.id = m.role_id
        where m.organization_id = org_id
          and m.user_id = auth.uid()
          and m.status = 'active'
          and r.key = 'organization_owner'
      )
      and public.session_has_aal2()
    );
$function$


-- uitvoeren door anon: nee, authenticated: nee
CREATE OR REPLACE FUNCTION public.check_location_capacity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_max integer;
  v_current integer;
begin
  select max_locations into v_max
  from public.organizations where id = new.organization_id;

  select count(*) into v_current
  from public.locations
  where organization_id = new.organization_id and not archived;

  if v_current >= v_max then
    raise exception 'Maximum aantal locaties bereikt voor deze organisatie (%)', v_max;
  end if;

  return new;
end;
$function$


-- uitvoeren door anon: nee, authenticated: nee
CREATE OR REPLACE FUNCTION public.check_member_capacity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_max     integer;
  v_current integer;
begin
  select max_members into v_max from public.organizations where id = new.organization_id;

  select
    (select count(*) from public.memberships where organization_id = new.organization_id and status <> 'suspended')
    + (select count(*) from public.membership_invites where organization_id = new.organization_id and status = 'pending')
  into v_current;

  if v_current >= v_max then
    raise exception 'Maximum aantal medewerkers bereikt voor deze organisatie (%)', v_max;
  end if;

  return new;
end;
$function$


-- uitvoeren door anon: nee, authenticated: nee
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_bucket text, p_max_hits integer, p_window_seconds integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_count int;
begin
  delete from public.rate_limit_hits
  where bucket = p_bucket
    and created_at < now() - (p_window_seconds || ' seconds')::interval;

  select count(*) into v_count from public.rate_limit_hits where bucket = p_bucket;

  if v_count >= p_max_hits then
    return false;
  end if;

  insert into public.rate_limit_hits (bucket) values (p_bucket);
  return true;
end;
$function$


-- uitvoeren door anon: nee, authenticated: JA
CREATE OR REPLACE FUNCTION public.copy_intake_goals_to_patient(p_patient_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$


-- uitvoeren door anon: nee, authenticated: nee
CREATE OR REPLACE FUNCTION public.delete_own_patient_dossier(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform set_config('app.audit_actor_id', p_user_id::text, true);
  delete from public.patients where user_id = p_user_id;
end;
$function$


-- uitvoeren door anon: nee, authenticated: nee
CREATE OR REPLACE FUNCTION public.delete_patient_dossier(p_patient_id uuid, p_actor_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform set_config('app.audit_actor_id', p_actor_id::text, true);
  delete from public.patients where id = p_patient_id;
end;
$function$


-- uitvoeren door anon: nee, authenticated: nee
CREATE OR REPLACE FUNCTION public.ensure_personal_organization(p_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_patient_id  uuid;
  v_org_id      uuid;
  v_loc_id      uuid;
  v_full_name   text;
  v_email       text;
  v_invite      record;
  v_had_invite  boolean := false;
begin
  select id into v_patient_id from public.patients where user_id = p_user_id;
  if v_patient_id is not null then
    return v_patient_id;
  end if;

  select email into v_email from auth.users where id = p_user_id;

  insert into public.profiles (id, email)
  values (p_user_id, v_email)
  on conflict (id) do nothing;

  if v_email is not null then
    for v_invite in
      select * from public.membership_invites
      where status = 'pending' and lower(email) = lower(v_email)
    loop
      insert into public.memberships (user_id, organization_id, role_id, location_id, status)
      values (p_user_id, v_invite.organization_id, v_invite.role_id, v_invite.location_id, 'active');

      update public.profiles
      set first_name = v_invite.first_name,
          last_name = v_invite.last_name,
          full_name = trim(v_invite.first_name || ' ' || v_invite.last_name)
      where id = p_user_id;

      update public.membership_invites set status = 'accepted' where id = v_invite.id;
      v_had_invite := true;
    end loop;
  end if;

  if v_email is not null then
    select id into v_patient_id
    from public.patients
    where user_id is null and lower(email) = lower(v_email)
    limit 1;

    if v_patient_id is not null then
      update public.patients set user_id = p_user_id where id = v_patient_id;
      perform public.copy_intake_goals_to_patient(v_patient_id);
      return v_patient_id;
    end if;
  end if;

  if v_had_invite then
    return null;
  end if;

  select full_name into v_full_name from public.profiles where id = p_user_id;

  insert into public.organizations (name)
  values (coalesce(nullif(trim(v_full_name), ''), 'Persoonlijke werkruimte'))
  returning id into v_org_id;

  insert into public.locations (organization_id, name)
  values (v_org_id, 'Hoofdlocatie')
  returning id into v_loc_id;

  insert into public.patients (organization_id, location_id, user_id)
  values (v_org_id, v_loc_id, p_user_id)
  returning id into v_patient_id;

  return v_patient_id;
end;
$function$


-- uitvoeren door anon: nee, authenticated: nee
CREATE OR REPLACE FUNCTION public.guard_organization_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_owner_editable constant text[] := array['name', 'primary_color', 'logo_path', 'updated_at'];
begin
  if auth.uid() is null or public.is_platform_admin() then
    return new;
  end if;

  if (to_jsonb(new) - v_owner_editable) is distinct from (to_jsonb(old) - v_owner_editable) then
    raise exception 'Alleen naam, kleur en logo van de organisatie kunnen vanuit de praktijk worden gewijzigd.'
      using errcode = '42501';
  end if;

  return new;
end;
$function$


-- uitvoeren door anon: nee, authenticated: nee
CREATE OR REPLACE FUNCTION public.handle_new_user_personal_organization()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.ensure_personal_organization(new.id);
  return new;
end;
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.memberships
    where organization_id = org_id
      and user_id = auth.uid()
      and status = 'active'
  );
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.is_platform_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.platform_admins where user_id = auth.uid()
  ) and public.session_has_aal2();
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.load_own_intake_body_side()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_body_side text;
begin
  select pi.body_side into v_body_side
  from public.patient_intakes pi
  join public.patients p on p.id = pi.patient_id
  where p.user_id = auth.uid()
  order by pi.completed_at desc nulls last
  limit 1;

  return v_body_side;
end;
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.load_own_intake_summary()
 RETURNS TABLE(mobility_aid text, weight_bearing_status text, rom_degrees smallint, return_to_sport_goal boolean, sport_type text, return_to_work_goal boolean, goal_timeframe_months smallint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return query
  select pi.mobility_aid, pi.weight_bearing_status, pi.rom_degrees,
         pi.return_to_sport_goal, pi.sport_type, pi.return_to_work_goal, pi.goal_timeframe_months
  from public.patient_intakes pi
  join public.patients p on p.id = pi.patient_id
  where p.user_id = auth.uid()
  order by pi.completed_at desc nulls last
  limit 1;
end;
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.log_patients_export(p_organization_id uuid, p_count integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.can_manage_org_patients(p_organization_id) then
    return;
  end if;

  insert into public.audit_log (table_name, record_id, patient_id, organization_id, actor_id, action, new_data)
  values ('patients_csv_export', null, null, p_organization_id, auth.uid(), 'export',
          jsonb_build_object('exported_count', p_count));
end;
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.mark_own_membership_welcomed(p_membership_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.memberships
  set welcomed_at = now()
  where id = p_membership_id
    and user_id = auth.uid();
end;
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.mark_own_patient_welcomed(p_patient_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.patients
  set welcomed_at = now()
  where id = p_patient_id
    and user_id = auth.uid();
end;
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.patient_care_context()
 RETURNS TABLE(organization_name text, location_name text, therapist_name text, injury_type text, injury_date date, surgery_date date, therapist_phone text, therapist_email text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select o.name, l.name, pr.full_name, p.injury_type, p.injury_date, p.surgery_date, pr.phone, au.email
  from public.patients p
  left join public.organizations o on o.id = p.organization_id
  left join public.locations l on l.id = p.location_id
  left join public.profiles pr on pr.id = p.assigned_therapist_id
  left join auth.users au on au.id = pr.id
  where p.user_id = auth.uid()
  limit 1;
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.patient_organization_branding()
 RETURNS TABLE(name text, primary_color text, logo_path text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select o.name, o.primary_color, o.logo_path
  from public.organizations o
  join public.patients p on p.organization_id = o.id
  where p.user_id = auth.uid()
  limit 1;
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.portal_find_user_by_email(p_email text)
 RETURNS TABLE(id uuid, full_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.id, p.full_name
  from public.profiles p
  where lower(p.email) = lower(p_email)
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.status = 'active'
    )
  limit 1;
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.portal_list_org_members(org_id uuid)
 RETURNS TABLE(membership_id uuid, user_id uuid, full_name text, first_name text, last_name text, email text, phone text, title text, big_number text, avatar_url text, avatar_path text, role_id uuid, role_key text, role_name text, location_id uuid, location_name text, membership_status text, last_sign_in_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    m.id,
    m.user_id,
    p.full_name,
    p.first_name,
    p.last_name,
    p.email,
    p.phone,
    p.title,
    p.big_number,
    p.avatar_url,
    p.avatar_path,
    r.id,
    r.key,
    r.name,
    m.location_id,
    l.name,
    m.status,
    u.last_sign_in_at
  from public.memberships m
  join public.roles r on r.id = m.role_id
  left join public.profiles p on p.id = m.user_id
  left join public.locations l on l.id = m.location_id
  left join auth.users u on u.id = m.user_id
  where m.organization_id = org_id
    and public.is_org_member(org_id)
  order by r.key, p.full_name;
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.portal_org_activity_summary(p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_inactive_patients int;
  v_inactive_staff int;
begin
  if not public.can_view_org_analytics(p_organization_id) then
    return jsonb_build_object('inactivePatientCount', 0, 'inactiveStaffCount', 0);
  end if;

  select count(*) into v_inactive_patients
  from public.patients p
  where p.organization_id = p_organization_id
    and p.status = 'active'
    and coalesce(
      (select max(c.date) from public.checkins c where c.patient_id = p.id),
      p.created_at::date
    ) < (current_date - 30);

  select count(*) into v_inactive_staff
  from public.memberships m
  left join auth.users u on u.id = m.user_id
  where m.organization_id = p_organization_id
    and m.status = 'active'
    and (u.last_sign_in_at is null or u.last_sign_in_at < (now() - interval '14 days'));

  return jsonb_build_object('inactivePatientCount', v_inactive_patients, 'inactiveStaffCount', v_inactive_staff);
end;
$function$


-- uitvoeren door anon: nee, authenticated: JA
CREATE OR REPLACE FUNCTION public.portal_org_agenda(p_organization_id uuid, p_from date, p_to date)
 RETURNS TABLE(id uuid, patient_id uuid, patient_name text, appointment_type text, date date, "time" text, provider_name text, title text, location text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_clinical boolean := public.can_view_clinical_data(p_organization_id);
begin
  if not (v_clinical or (public.is_org_member(p_organization_id) and public.session_has_aal2())) then
    raise exception 'Geen toegang tot deze organisatie.' using errcode = '42501';
  end if;

  return query
  select
    a.id,
    a.patient_id,
    coalesce(pp.full_name, nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''))::text,
    a.appointment_type::text,
    a.date::date,
    a.time::text,
    a.provider_name::text,
    case when v_clinical then a.title::text end,
    case when v_clinical then a.location::text end
  from public.appointments a
  join public.patients p on p.id = a.patient_id
  left join public.profiles pp on pp.id = p.user_id
  where p.organization_id = p_organization_id
    and a.date between p_from and p_to
    and (v_clinical or a.appointment_type = 'fysio')
  order by a.date, a.time nulls last;
end;
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.portal_org_usage_stats(p_organization_id uuid, p_period_days integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_patient_ids uuid[];
  v_total_patients int;
  v_result jsonb;
begin
  if not public.can_view_org_analytics(p_organization_id) then
    return jsonb_build_object(
      'periodDays', p_period_days, 'trend', '[]'::jsonb,
      'totalCheckins', 0, 'totalTrainingsCompleted', 0,
      'activePatientCount', 0, 'totalPatientCount', 0
    );
  end if;

  select coalesce(array_agg(id), array[]::uuid[]), count(*)
    into v_patient_ids, v_total_patients
  from public.patients
  where organization_id = p_organization_id;

  with days as (
    select (current_date - i)::date as d
    from generate_series(0, p_period_days - 1) as i
  ),
  daily_checkins as (
    select date, count(*) as cnt
    from public.checkins
    where patient_id = any(v_patient_ids)
      and date >= (current_date - (p_period_days - 1))
    group by date
  ),
  daily_trainings as (
    select date, count(*) as cnt
    from public.training_logs
    where patient_id = any(v_patient_ids)
      and completed = true
      and date >= (current_date - (p_period_days - 1))
    group by date
  )
  select jsonb_build_object(
    'periodDays', p_period_days,
    'trend', coalesce(jsonb_agg(jsonb_build_object(
        'date', to_char(days.d, 'YYYY-MM-DD'),
        'checkins', coalesce(dc.cnt, 0),
        'trainingsCompleted', coalesce(dt.cnt, 0)
      ) order by days.d), '[]'::jsonb),
    'totalCheckins', coalesce(sum(dc.cnt), 0),
    'totalTrainingsCompleted', coalesce(sum(dt.cnt), 0),
    'activePatientCount', (
      select count(distinct patient_id) from public.checkins
      where patient_id = any(v_patient_ids) and date >= (current_date - (p_period_days - 1))
    ),
    'totalPatientCount', v_total_patients
  ) into v_result
  from days
  left join daily_checkins dc on dc.date = days.d
  left join daily_trainings dt on dt.date = days.d;

  return v_result;
end;
$function$


-- uitvoeren door anon: nee, authenticated: JA
CREATE OR REPLACE FUNCTION public.portal_patient_count(p_organization_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case
    when public.is_platform_admin() or (public.is_org_member(p_organization_id) and public.session_has_aal2())
      then (select count(*)::int from public.patients where organization_id = p_organization_id)
    else 0
  end;
$function$


-- uitvoeren door anon: nee, authenticated: JA
CREATE OR REPLACE FUNCTION public.portal_patient_directory(p_organization_id uuid)
 RETURNS TABLE(id uuid, name text, email text, phone text, date_of_birth date, status text, location_name text, therapist_name text, has_account boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not (public.is_platform_admin() or (public.is_org_member(p_organization_id) and public.session_has_aal2())) then
    raise exception 'Geen toegang tot deze organisatie.' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), pp.full_name, p.email)::text,
    coalesce(p.email, pp.email)::text,
    p.phone::text,
    p.date_of_birth,
    p.status::text,
    l.name::text,
    tp.full_name::text,
    (p.user_id is not null)
  from public.patients p
  left join public.profiles pp on pp.id = p.user_id
  left join public.locations l on l.id = p.location_id
  left join public.profiles tp on tp.id = p.assigned_therapist_id
  where p.organization_id = p_organization_id
  order by 2;
end;
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.portal_quality_stats(p_organization_id uuid, p_period_days integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_period_start timestamptz := date_trunc('day', now()) - (p_period_days || ' days')::interval;
  v_patient_ids uuid[];
  v_completed_phases int;
  v_completed_phases_with_checkin int;
  v_ai_intake_count int;
  v_ai_room_suggestions_count int;
begin
  if not public.can_view_org_analytics(p_organization_id) then
    return jsonb_build_object(
      'completedPhasesCount', 0, 'completedPhasesWithCheckinCount', 0,
      'aiIntakeCount', 0, 'aiRoomSuggestionsTakenCount', 0
    );
  end if;

  select coalesce(array_agg(id), array[]::uuid[]) into v_patient_ids
  from public.patients where organization_id = p_organization_id;

  select
    count(*),
    count(*) filter (
      where pp.transition_pain_score is not null or pp.transition_mobility_score is not null
        or pp.transition_swelling is not null or pp.transition_satisfaction_score is not null
        or pp.transition_progress_vs_expected is not null or pp.transition_note is not null
    )
    into v_completed_phases, v_completed_phases_with_checkin
  from public.patient_protocol_phases pp
  join public.patient_protocols ppr on ppr.id = pp.patient_protocol_id
  where ppr.patient_id = any(v_patient_ids)
    and pp.status = 'completed'
    and pp.completed_at >= v_period_start;

  select count(*) into v_ai_intake_count
  from public.patient_intakes
  where patient_id = any(v_patient_ids) and created_at >= v_period_start;

  select count(*) into v_ai_room_suggestions_count
  from public.room_reservations rr
  join public.location_rooms lr on lr.id = rr.room_id
  join public.locations l on l.id = lr.location_id
  where l.organization_id = p_organization_id
    and rr.source = 'ai_suggested'
    and rr.created_at >= v_period_start;

  return jsonb_build_object(
    'completedPhasesCount', v_completed_phases,
    'completedPhasesWithCheckinCount', v_completed_phases_with_checkin,
    'aiIntakeCount', v_ai_intake_count,
    'aiRoomSuggestionsTakenCount', v_ai_room_suggestions_count
  );
end;
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.portal_recovery_duration_stats(p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_result jsonb;
begin
  if not public.can_view_org_analytics(p_organization_id) then
    return jsonb_build_object('totalDischarged', 0, 'avgDurationDays', null, 'byInjuryCategory', '[]'::jsonb, 'patientsPerYear', '[]'::jsonb);
  end if;

  with latest_protocol as (
    select distinct on (pp.patient_id) pp.patient_id, pp.injury_category, pp.assigned_at
    from public.patient_protocols pp
    join public.patients p on p.id = pp.patient_id
    where p.organization_id = p_organization_id
    order by pp.patient_id, pp.assigned_at desc
  ),
  discharged as (
    select p.id, p.discharge_outcome, lp.injury_category,
      extract(epoch from (p.discharged_at - lp.assigned_at)) / 86400.0 as duration_days
    from public.patients p
    join latest_protocol lp on lp.patient_id = p.id
    where p.organization_id = p_organization_id and p.discharged_at is not null
  ),
  by_category as (
    select injury_category, count(*) as cnt, avg(duration_days) as avg_days
    from discharged
    where injury_category is not null
    group by injury_category
  ),
  by_year as (
    select extract(year from created_at)::int as yr, count(*) as cnt
    from public.patients
    where organization_id = p_organization_id
    group by 1
    order by 1 desc
    limit 6
  )
  select jsonb_build_object(
    'totalDischarged', (select count(*) from discharged),
    'avgDurationDays', (select round(avg(duration_days), 1) from discharged),
    'byInjuryCategory', coalesce((
      select jsonb_agg(jsonb_build_object('injuryCategory', injury_category, 'count', cnt, 'avgDurationDays', round(avg_days, 1)) order by cnt desc)
      from by_category
    ), '[]'::jsonb),
    'patientsPerYear', coalesce((
      select jsonb_agg(jsonb_build_object('year', yr, 'count', cnt) order by yr desc)
      from by_year
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.portal_room_occupancy_stats(p_organization_id uuid, p_period_days integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_period_start timestamptz := date_trunc('day', now()) - ((p_period_days - 1) || ' days')::interval;
  v_period_end timestamptz := date_trunc('day', now()) + interval '1 day';
  v_result jsonb;
begin
  if not public.can_view_org_analytics(p_organization_id) then
    return '[]'::jsonb;
  end if;

  with days as (
    select generate_series(v_period_start, date_trunc('day', now()), interval '1 day')::date as d
  ),
  day_key as (
    select d, (case extract(dow from d)::int
      when 0 then 'sunday' when 1 then 'monday' when 2 then 'tuesday' when 3 then 'wednesday'
      when 4 then 'thursday' when 5 then 'friday' else 'saturday' end) as key
    from days
  ),
  active_rooms as (
    select lr.id as room_id, lr.location_id
    from public.location_rooms lr
    join public.locations l on l.id = lr.location_id
    where l.organization_id = p_organization_id and lr.archived = false and l.archived = false
  ),
  room_days as (
    select ar.room_id, ar.location_id, dk.key
    from active_rooms ar cross join day_key dk
  ),
  capacity as (
    select
      rd.location_id,
      count(distinct rd.room_id) as room_count,
      coalesce(sum(
        case when (l.opening_hours -> rd.key ->> 'open')::boolean is true
        then extract(epoch from (
          (l.opening_hours -> rd.key ->> 'to')::time - (l.opening_hours -> rd.key ->> 'from')::time
        )) / 60
        else 0 end
      ), 0) as available_minutes
    from room_days rd
    join public.locations l on l.id = rd.location_id
    group by rd.location_id
  ),
  reserved as (
    select ar.location_id, coalesce(sum(extract(epoch from (rr.ends_at - rr.starts_at)) / 60), 0) as reserved_minutes
    from public.room_reservations rr
    join active_rooms ar on ar.room_id = rr.room_id
    where rr.starts_at >= v_period_start and rr.starts_at < v_period_end
    group by ar.location_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'locationId', l.id,
      'locationName', l.name,
      'roomCount', coalesce(c.room_count, 0),
      'reservedMinutes', round(coalesce(r.reserved_minutes, 0)),
      'availableMinutes', round(coalesce(c.available_minutes, 0))
    ) order by l.name), '[]'::jsonb)
    into v_result
  from public.locations l
  left join capacity c on c.location_id = l.id
  left join reserved r on r.location_id = l.id
  where l.organization_id = p_organization_id and l.archived = false;

  return v_result;
end;
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.portal_therapist_workload(p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_result jsonb;
  v_unassigned int;
begin
  if not public.can_view_org_analytics(p_organization_id) then
    return jsonb_build_object('rows', '[]'::jsonb, 'unassignedCount', 0);
  end if;

  select count(*) into v_unassigned
  from public.patients
  where organization_id = p_organization_id
    and status = 'active'
    and assigned_therapist_id is null;

  select coalesce(jsonb_agg(jsonb_build_object('userId', assigned_therapist_id, 'patientCount', cnt)), '[]'::jsonb)
    into v_result
  from (
    select assigned_therapist_id, count(*) as cnt
    from public.patients
    where organization_id = p_organization_id
      and status = 'active'
      and assigned_therapist_id is not null
    group by assigned_therapist_id
  ) t;

  return jsonb_build_object('rows', v_result, 'unassignedCount', v_unassigned);
end;
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$


-- uitvoeren door anon: nee, authenticated: nee
CREATE OR REPLACE FUNCTION public.set_first_location_as_main()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (
    select 1 from public.locations where organization_id = new.organization_id
  ) then
    new.is_main_location := true;
  end if;
  return new;
end;
$function$


-- uitvoeren door anon: JA, authenticated: JA
CREATE OR REPLACE FUNCTION public.set_main_location(p_location_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id
  from public.locations
  where id = p_location_id and not archived;

  if v_org_id is null then
    raise exception 'Vestiging niet gevonden of gearchiveerd';
  end if;

  if not public.can_manage_org_locations(v_org_id) then
    raise exception 'Geen toegang';
  end if;

  update public.locations set is_main_location = false
  where organization_id = v_org_id and is_main_location = true;

  update public.locations set is_main_location = true
  where id = p_location_id;
end;
$function$


-- uitvoeren door anon: nee, authenticated: nee
CREATE OR REPLACE FUNCTION public.set_patient_id_from_user_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.patient_id is null then
    select id into new.patient_id from public.patients where user_id = new.user_id;
  end if;
  return new;
end;
$function$


-- uitvoeren door anon: nee, authenticated: nee
CREATE OR REPLACE FUNCTION public.sync_settings_from_patient()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.user_id is null then
    return new;
  end if;

  insert into public.settings (user_id, birth_date, surgery_date, injury_type, injury_date)
  values (new.user_id, new.date_of_birth, new.surgery_date, new.injury_type, new.injury_date)
  on conflict (user_id) do update
    set birth_date   = excluded.birth_date,
        surgery_date = excluded.surgery_date,
        injury_type  = excluded.injury_type,
        injury_date  = excluded.injury_date;

  return new;
end;
$function$
