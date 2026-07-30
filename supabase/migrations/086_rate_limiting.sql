-- 086_rate_limiting.sql
-- Geen enkele API-route (feedback, send-invite, mfa-reset, delete-account,
-- delete-patient) had rate limiting — een gescript verzoek kon ongelimiteerd
-- de Resend-mailquota opmaken of herhaaldelijk gevoelige acties triggeren.
--
-- Bewust een Postgres-tabel i.p.v. een in-memory teller: deze routes draaien
-- op Vercel als losse, stateless serverless functions (mogelijk meerdere
-- gelijktijdige instanties, elk met een eigen geheugen) — een teller in
-- proces-geheugen telt dus alleen binnen één toevallige instantie en biedt
-- geen echte bescherming zodra het verkeer over meerdere instances verdeeld
-- wordt. De database is de enige gedeelde bron van waarheid die alle
-- instances zien, en is al de gedeelde infrastructuur van dit project (geen
-- nieuwe externe dienst nodig zoals Redis om dit correct te laten werken).
--
-- Bewust een "zachte" limiter (delete + count + insert, geen SELECT ... FOR
-- UPDATE-vergrendeling): bij een race tussen twee gelijktijdige verzoeken
-- kan de telling een enkele keer net iets te soepel zijn. Voor
-- misbruikpreventie (niet voor facturatie-nauwkeurigheid) is dat acceptabel
-- — de tabel groeit niet ongebreideld dankzij de opruimstap per aanroep.

create table if not exists public.rate_limit_hits (
  id         bigserial primary key,
  bucket     text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_hits_bucket_created_idx
  on public.rate_limit_hits (bucket, created_at desc);

alter table public.rate_limit_hits enable row level security;
-- Bewust geen enkele policy: deze tabel is uitsluitend bedoeld voor de
-- server-side API-routes via de onderstaande SECURITY DEFINER-functie, nooit
-- voor rechtstreekse client-toegang.

create or replace function public.check_rate_limit(p_bucket text, p_max_hits int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
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
$$;

-- Zowel authenticated (mfa-reset/send-invite/delete-account/delete-patient
-- draaien altijd met een ingelogde gebruiker) als anon (feedback is bewust
-- niet ingelogd) mogen dit aanroepen — de functie zelf lekt geen data terug
-- (alleen true/false) en de bucket-sleutel wordt altijd server-side bepaald
-- (IP-adres of eigen user id), nooit vrij door de aanroeper gekozen.
grant execute on function public.check_rate_limit(text, int, int) to anon, authenticated;

notify pgrst, 'reload schema';
