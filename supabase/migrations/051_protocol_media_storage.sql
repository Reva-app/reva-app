-- 051_protocol_media_storage.sql
-- Protocol Engine: opslag voor oefening-/educatiemedia (foto/video). Privé
-- vanaf dag 1 — nooit `public = true` maken, zie de datalek-les uit
-- 013_storage_lockdown.sql (publieke buckets + alleen bucket_id-check op de
-- SELECT-policy betekende dat elke ingelogde gebruiker andermans bestanden
-- kon lezen). Padconventie: `${organizationId}/${exerciseId}/bestand` voor
-- organisatie-eigen media, `reva/${exerciseId}/bestand` (letterlijk het
-- woord "reva" als eerste mapsegment) voor REVA-schaal media.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'protocol-media',
  'protocol-media',
  false,
  52428800, -- 50 MB, ruim genoeg voor korte instructievideo's
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
)
on conflict (id) do nothing;

-- ── REVA-schaal media (eerste mapsegment = letterlijk 'reva') ──────────────

create policy "protocol_media_select_reva"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'protocol-media'
    and (storage.foldername(name))[1] = 'reva'
  );

create policy "protocol_media_manage_reva"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'protocol-media'
    and (storage.foldername(name))[1] = 'reva'
    and public.is_platform_admin()
  )
  with check (
    bucket_id = 'protocol-media'
    and (storage.foldername(name))[1] = 'reva'
    and public.is_platform_admin()
  );

-- ── Organisatie-schaal media (eerste mapsegment = organization_id) ─────────
-- De `case`-vorm voorkomt een cast-fout op rijen waar het eerste mapsegment
-- letterlijk 'reva' is (geen geldige uuid) — expliciet short-circuit i.p.v.
-- op AND-volgorde te vertrouwen.

create policy "protocol_media_select_org"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'protocol-media'
    and case
      when (storage.foldername(name))[1] = 'reva' then false
      else public.is_org_member(((storage.foldername(name))[1])::uuid)
    end
  );

create policy "protocol_media_manage_org"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'protocol-media'
    and case
      when (storage.foldername(name))[1] = 'reva' then false
      else public.can_manage_org_protocols(((storage.foldername(name))[1])::uuid)
    end
  )
  with check (
    bucket_id = 'protocol-media'
    and case
      when (storage.foldername(name))[1] = 'reva' then false
      else public.can_manage_org_protocols(((storage.foldername(name))[1])::uuid)
    end
  );

-- ── Patiënt leest media van zijn eigen toegewezen protocol ─────────────────
-- Additief bovenop bovenstaande policies — een patiënt is doorgaans geen
-- organisatielid, dus zonder deze policy zou hij een oefeningsvideo in zijn
-- eigen, toegewezen protocol niet kunnen zien.

create policy "protocol_media_select_patient_assigned"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'protocol-media'
    and (
      exists (
        select 1
        from public.patient_protocol_schedule_exercises se
        join public.patient_protocol_schedules s on s.id = se.schedule_id
        join public.patient_protocol_phases ph on ph.id = s.phase_id
        join public.patient_protocols pp on pp.id = ph.patient_protocol_id
        join public.patients p on p.id = pp.patient_id
        where se.media_path = storage.objects.name and p.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.patient_protocol_phase_education_items ei
        join public.patient_protocol_phases ph on ph.id = ei.phase_id
        join public.patient_protocols pp on pp.id = ph.patient_protocol_id
        join public.patients p on p.id = pp.patient_id
        where ei.media_path = storage.objects.name and p.user_id = auth.uid()
      )
    )
  );
