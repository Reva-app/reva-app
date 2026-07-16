-- 037_fix_checkins_swelling_type.sql
-- Ontdekt tijdens het bouwen van de portal patiënt-detailpagina: de live
-- `checkins.swelling` kolom is `text` (waarden de letterlijke strings
-- "true"/"false"), niet `boolean` zoals schema.sql beschrijft — weer een
-- geval van een tabel die ooit via de SQL-editor is aangemaakt met een
-- andere definitie dan de migratiebestanden claimen (zelfde patroon als
-- eerder gevonden bij medication_schedule_times.sort_order).
--
-- Impact: elke plek die `if (checkin.zwelling)` checkt (o.a.
-- lib/db/mappers.ts: `zwelling: row.swelling ?? false`) kreeg in
-- werkelijkheid de string "false" binnen — een niet-lege string is truthy
-- in JavaScript, dus deze check stond overal stilzwijgend altijd "aan".
-- Alle 16 bestaande rijen hebben alleen 'true'/'false' als waarde (geen
-- NULLs, geen afwijkende waardes), dus de cast is veilig.

alter table public.checkins
  alter column swelling type boolean using swelling::boolean;
