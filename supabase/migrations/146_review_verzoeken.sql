-- 146: reviewverzoeken bijhouden.
--
-- REVA vraagt patiënten, behandelaars en praktijkeigenaren op een natuurlijk
-- moment (na echte waarde: fase afgerond, weken actief gebruik) om een
-- Google-review of feedback. Deze tabel voorkomt dat we te vaak vragen,
-- ook over apparaten heen. Iedereen die het verzoek ziet krijgt dezelfde
-- keuze (review of feedback): geen selectie op tevredenheid, conform het
-- reviewbeleid van Google.

create table if not exists public.review_prompts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  audience    text not null check (audience in ('patient', 'therapist', 'owner')),
  trigger     text not null check (char_length(trigger) <= 40),
  event       text not null check (event in ('shown', 'review', 'feedback', 'later', 'never')),
  created_at  timestamptz not null default now()
);

create index if not exists review_prompts_user_idx on public.review_prompts (user_id, created_at);

alter table public.review_prompts enable row level security;

drop policy if exists "Eigen reviewverzoeken lezen" on public.review_prompts;
create policy "Eigen reviewverzoeken lezen" on public.review_prompts
  for select using (user_id = auth.uid());

drop policy if exists "Eigen reviewverzoek vastleggen" on public.review_prompts;
create policy "Eigen reviewverzoek vastleggen" on public.review_prompts
  for insert with check (user_id = auth.uid());
