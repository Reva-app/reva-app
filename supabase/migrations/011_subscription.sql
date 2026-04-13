-- 011_subscription.sql
-- Voegt abonnements- en trial-velden toe aan de settings tabel.

alter table public.settings
  add column if not exists trial_start_date      timestamptz,
  add column if not exists trial_end_date        timestamptz,
  add column if not exists plan_type             text not null default 'free',
  add column if not exists subscription_status   text not null default 'inactive',
  add column if not exists subscription_source   text,
  add column if not exists subscription_expires_at timestamptz;

comment on column public.settings.plan_type             is 'free | premium';
comment on column public.settings.subscription_status  is 'inactive | active | cancelled | expired';
comment on column public.settings.subscription_source  is 'stripe | google_play | apple | null';
