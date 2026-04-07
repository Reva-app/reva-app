-- Migration 007: Enable RLS on appointments table and add user policies

alter table public.appointments enable row level security;

create policy "Users can manage own appointments"
  on public.appointments
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
