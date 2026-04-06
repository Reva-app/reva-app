-- Migration 005: Add medication_schedule_times table
-- Replaces the times[] array column on medication_schedules with a normalized junction table.

create table if not exists medication_schedule_times (
  id          bigserial primary key,
  schedule_id uuid        not null references medication_schedules(id) on delete cascade,
  time        text        not null,
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists medication_schedule_times_schedule_id_idx
  on medication_schedule_times (schedule_id);

alter table medication_schedule_times enable row level security;

create policy "Users can manage own schedule times"
  on medication_schedule_times
  for all
  using (
    exists (
      select 1 from medication_schedules s
      where s.id = schedule_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from medication_schedules s
      where s.id = schedule_id
        and s.user_id = auth.uid()
    )
  );
