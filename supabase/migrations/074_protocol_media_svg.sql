-- 074_protocol_media_svg.sql
-- De protocol-media bucket (migratie 051) stond alleen jpeg/png/webp/mp4/mov
-- toe. De REVA-oefeningbibliotheek krijgt nu automatisch gegenereerde,
-- consistente lijntekening-illustraties (SVG) — svg toevoegen aan de
-- toegestane mime-types, verder ongewijzigd (privé, zelfde RLS als 051).

update storage.buckets
set allowed_mime_types = array_append(allowed_mime_types, 'image/svg+xml')
where id = 'protocol-media'
  and not ('image/svg+xml' = any(allowed_mime_types));
