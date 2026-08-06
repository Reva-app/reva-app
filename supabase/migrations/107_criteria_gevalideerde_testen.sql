-- 107_criteria_gevalideerde_testen.sql
--
-- ============================================================================
-- BELANGRIJK — KLINISCHE INHOUD NOG NIET GEVERIFIEERD
-- ============================================================================
-- Feedback: criteria als "kunnen lopen zonder krukken" zijn te vaag voor een
-- serieus herstelplan — voeg bij de belangrijkste (meest gebruikte)
-- herstelplannen echte, in de fysiotherapie erkende meetinstrumenten en
-- testen toe, naast de bestaande criteria (niet ter vervanging — dit is een
-- aanvulling, geen herschrijving). Gescoped tot de "vlaggenschip"-
-- categorieën waar REVA al vanaf het begin op focust (zie Claude.md:
-- knieblessures, knieoperatie, sportblessures): ACL, meniscus, totale
-- knieprothese, rotator cuff, enkelverzwikking, lage rugklachten,
-- hamstringblessure, totale heupprothese. Verdere categorieën volgen later.
--
-- De testen zelf zijn gekozen op basis van algemene, breed erkende
-- fysiotherapie-uitkomstmaten (hoptest, IKDC, Oxford Knee Score, Constant-
-- Murley, Oswestry Disability Index, etc.) — dit vervangt geen toetsing aan
-- de daadwerkelijke KNGF-richtlijnen. clinically_reviewed blijft daarom
-- ongewijzigd op elk van deze protocollen staan; dit voegt alleen criteria
-- toe, het verandert niets aan de reviewstatus.
--
-- Elke toevoeging is een nieuwe insert into protocol_phase_criteria met een
-- hoog sort_order (90+), zodat de nieuwe, objectieve testen na de bestaande
-- criteria in de lijst verschijnen zonder de bestaande volgorde te
-- verstoren. phase_id wordt per stuk opgezocht via protocol- + fasenaam
-- (exact zoals live aanwezig, geverifieerd voorafgaand aan deze migratie).

do $$
declare
  v_phase uuid;
begin

  -- ── ACL ──────────────────────────────────────────────────────────────────
  select ph.id into v_phase from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id
    where p.name = 'ACL-reconstructie herstelprotocol' and ph.name = 'Fase 6: Terugkeer naar sport';
  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Single-leg hoptest: symmetrie-index minimaal 90% t.o.v. de niet-geopereerde zijde', 90),
    (v_phase, 'IKDC Subjective Knee Form: score minimaal 90', 91);

  select ph.id into v_phase from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id
    where p.name = 'ACL-reconstructie herstelprotocol' and ph.name = 'Fase 5: Sportspecifieke training';
  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Quadriceps- en hamstringkracht (isokinetisch of handheld dynamometer): minimaal 90% symmetrie', 90);

  select ph.id into v_phase from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id
    where p.name = 'Conservatief ACL-traject (zonder operatie)' and ph.name = 'Fase 4: Terugkeer naar sport en onderhoud';
  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Single-leg hoptest: symmetrie-index minimaal 90% t.o.v. de andere zijde', 90),
    (v_phase, 'IKDC Subjective Knee Form: score minimaal 90', 91);

  -- ── Meniscus ─────────────────────────────────────────────────────────────
  select ph.id into v_phase from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id
    where p.name = 'Meniscusoperatie herstelprotocol' and ph.name = 'Fase 4: Terugkeer naar sport';
  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Single-leg hoptest: symmetrie-index minimaal 90% t.o.v. de niet-geopereerde zijde', 90),
    (v_phase, 'Quadricepskracht: minimaal 90% symmetrie t.o.v. de andere zijde', 91);

  select ph.id into v_phase from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id
    where p.name = 'Herstelplan partiële meniscectomie' and ph.name = 'Fase 4: Terugkeer naar sport';
  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Single-leg hoptest: symmetrie-index minimaal 90% t.o.v. de andere zijde', 90),
    (v_phase, 'Quadricepskracht: minimaal 90% symmetrie t.o.v. de andere zijde', 91);

  -- ── Totale knieprothese ──────────────────────────────────────────────────
  select ph.id into v_phase from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id
    where p.name = 'Totale knieprothese herstelprotocol' and ph.name = 'Fase 4: Onderhoud en terugkeer naar activiteiten';
  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Oxford Knee Score: significante verbetering t.o.v. voor de operatie', 90),
    (v_phase, 'Timed Up and Go (TUG)-test: minder dan 12 seconden', 91);

  select ph.id into v_phase from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id
    where p.name = 'Versneld hersteltraject knieprothese (fast-track / ERAS)' and ph.name = 'Fase 3: Terugkeer naar activiteit en onderhoud';
  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Oxford Knee Score: significante verbetering t.o.v. voor de operatie', 90),
    (v_phase, 'Timed Up and Go (TUG)-test: minder dan 12 seconden', 91);

  -- ── Rotator cuff ─────────────────────────────────────────────────────────
  select ph.id into v_phase from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id
    where p.name = 'Rotator cuff schouderoperatie herstelprotocol' and ph.name = 'Fase 4: Terugkeer naar activiteit en onderhoud';
  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Constant-Murley Score: minimaal 80, of vergelijkbaar met de andere zijde', 90),
    (v_phase, 'DASH-score (Disabilities of the Arm, Shoulder and Hand): duidelijke verbetering t.o.v. voor het herstel', 91);

  select ph.id into v_phase from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id
    where p.name = 'Herstelplan subacromiale decompressie (schouder)' and ph.name = 'Fase 4: Terugkeer naar sport en werk';
  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Constant-Murley Score: minimaal 80, of vergelijkbaar met de andere zijde', 90),
    (v_phase, 'DASH-score (Disabilities of the Arm, Shoulder and Hand): duidelijke verbetering t.o.v. voor het herstel', 91);

  select ph.id into v_phase from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id
    where p.name = 'Herstelplan schouderoverbelasting (impingement, conservatief)' and ph.name = 'Fase 3: Terugkeer naar volledige bovenhoofdse activiteit en onderhoud';
  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Constant-Murley Score: minimaal 80, of vergelijkbaar met de andere zijde', 90),
    (v_phase, 'DASH-score (Disabilities of the Arm, Shoulder and Hand): duidelijke verbetering t.o.v. voor het herstel', 91);

  -- ── Enkelverzwikking ─────────────────────────────────────────────────────
  select ph.id into v_phase from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id
    where p.name = 'Herstelplan enkelverzwikking (voetbal)' and ph.name = 'Fase 3: Terugkeer naar sport';
  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Cumberland Ankle Instability Tool (CAIT): score minimaal 27', 90),
    (v_phase, 'Single-leg balanstest: minimaal 30 seconden, ogen open', 91);

  select ph.id into v_phase from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id
    where p.name = 'Herstelplan enkelverzwikking (hardlopen)' and ph.name = 'Fase 4: Hardloop-mijlageopbouw en terugkeer';
  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Cumberland Ankle Instability Tool (CAIT): score minimaal 27', 90),
    (v_phase, 'Single-leg balanstest: minimaal 30 seconden, ogen open', 91);

  -- ── Lage rugklachten ─────────────────────────────────────────────────────
  select ph.id into v_phase from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id
    where p.name = 'Herstelplan lage rugklachten' and ph.name = 'Fase 3: Kracht en functionele belasting';
  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Oswestry Disability Index (ODI): score maximaal 20%', 90);

  select ph.id into v_phase from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id
    where p.name = 'Herstelplan lage rugklachten met uitstraling (radiculair)' and ph.name = 'Fase 4: Terugkeer naar volledige belasting en onderhoud';
  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Oswestry Disability Index (ODI): score maximaal 20%', 90);

  -- ── Hamstringblessure ────────────────────────────────────────────────────
  select ph.id into v_phase from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id
    where p.name = 'Herstelplan hamstringblessure (voetbal)' and ph.name = 'Fase 3: Sprintopbouw en terugkeer naar sport';
  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Actieve knie-extensietest: symmetrie minimaal 90% t.o.v. de andere zijde', 90),
    (v_phase, 'Isokinetische hamstring/quadriceps-krachtratio binnen normwaarden', 91);

  select ph.id into v_phase from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id
    where p.name = 'Herstelplan hamstringblessure (proximaal, graad II)' and ph.name = 'Fase 4: Sprintopbouw en terugkeer naar sport';
  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Actieve knie-extensietest: symmetrie minimaal 90% t.o.v. de andere zijde', 90),
    (v_phase, 'Isokinetische hamstring/quadriceps-krachtratio binnen normwaarden', 91);

  -- ── Totale heupprothese ──────────────────────────────────────────────────
  select ph.id into v_phase from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id
    where p.name = 'Totale heupprothese herstelprotocol' and ph.name = 'Fase 4: Onderhoud en terugkeer naar activiteiten';
  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Harris Hip Score: significante verbetering t.o.v. voor de operatie', 90),
    (v_phase, 'Timed Up and Go (TUG)-test: minder dan 12 seconden', 91);

  select ph.id into v_phase from public.protocol_phases ph join public.protocols p on p.id = ph.protocol_id
    where p.name = 'Totale heupprothese herstelprotocol, voorste (anterieure) benadering' and ph.name = 'Fase 4: Onderhoud en terugkeer naar activiteiten';
  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Harris Hip Score: significante verbetering t.o.v. voor de operatie', 90),
    (v_phase, 'Timed Up and Go (TUG)-test: minder dan 12 seconden', 91);

end $$;

notify pgrst, 'reload schema';
