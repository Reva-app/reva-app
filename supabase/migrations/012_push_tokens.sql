-- 012_push_tokens.sql
-- Slaat FCM/APNs device tokens op per gebruiker.
-- Eén gebruiker kan meerdere devices hebben.

create table if not exists public.push_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  token         text not null,
  platform      text not null check (platform in ('android', 'ios', 'web')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, token)
);

-- RLS
alter table public.push_tokens enable row level security;

create policy "Gebruiker beheert eigen tokens"
  on public.push_tokens
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index voor ophalen tokens per user (gebruikt door Edge Function)
create index if not exists push_tokens_user_idx on public.push_tokens(user_id);
