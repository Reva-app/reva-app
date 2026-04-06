-- Migration 006: Add notification_states table
-- Persists per-user read/logged notification state in Supabase
-- so it survives logout/login and device changes.

create table if not exists notification_states (
  user_id    uuid        primary key references auth.users(id) on delete cascade,
  read_ids   text[]      not null default '{}',
  logged_ids text[]      not null default '{}',
  updated_at timestamptz not null default now()
);

alter table notification_states enable row level security;

create policy "Users can manage own notification state"
  on notification_states
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
