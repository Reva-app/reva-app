-- 141_web_push.sql
-- Pushmeldingen in de webapp (ook als REVA op het beginscherm staat).
-- Eén rij per apparaat/browser; de Edge Function send-checkin-reminder en
-- /api/push/test sturen hiernaar met VAPID (Web Push-standaard).
-- Inhoud van een melding is altijd algemeen ("Tijd voor je check-in"),
-- nooit medisch: een melding staat op het vergrendelscherm.

create table if not exists public.web_push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists web_push_subscriptions_user_idx on public.web_push_subscriptions (user_id);

alter table public.web_push_subscriptions enable row level security;

drop policy if exists "Eigen pushabonnementen lezen" on public.web_push_subscriptions;
create policy "Eigen pushabonnementen lezen" on public.web_push_subscriptions
  for select using (user_id = auth.uid());

drop policy if exists "Eigen pushabonnement toevoegen" on public.web_push_subscriptions;
create policy "Eigen pushabonnement toevoegen" on public.web_push_subscriptions
  for insert with check (user_id = auth.uid());

drop policy if exists "Eigen pushabonnement bijwerken" on public.web_push_subscriptions;
create policy "Eigen pushabonnement bijwerken" on public.web_push_subscriptions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Eigen pushabonnement verwijderen" on public.web_push_subscriptions;
create policy "Eigen pushabonnement verwijderen" on public.web_push_subscriptions
  for delete using (user_id = auth.uid());

-- Opslaan via een functie: hetzelfde apparaat kan na uitloggen door een
-- ander account worden gebruikt; het abonnement gaat dan naar de nieuwe
-- gebruiker (een oude rij van iemand anders mag de client niet zelf wijzigen).
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd';
  end if;
  insert into public.web_push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, created_at = now();
end;
$$;

revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
