-- 059_sales_pipeline.sql
-- Simpele sales-pijplijn voor de Super Admin Portal: bedrijven die nog GEEN
-- REVA-klant zijn, benaderd door de platformbeheerder. Bewust een aparte
-- tabel, los van `organizations` (dat zijn al bestaande klanten) — bij een
-- gewonnen deal maakt de beheerder handmatig het echte bedrijf aan via de
-- bestaande "Nieuw bedrijf toevoegen"-flow op /admin/organisaties.

create table if not exists public.sales_leads (
  id                  uuid primary key default gen_random_uuid(),
  company_name        text not null,
  contact_name        text,
  contact_email       text,
  contact_phone       text,
  stage               text not null default 'nieuw'
                        check (stage in ('nieuw','contact_gelegd','demo_gepland','onderhandeling','gewonnen','verloren')),
  estimated_value     numeric(10,2),
  notes               text,
  last_contact_date   date,
  next_action_date    date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references auth.users(id) on delete set null default auth.uid()
);

create index if not exists sales_leads_stage_idx on public.sales_leads(stage);

create trigger set_sales_leads_updated_at
  before update on public.sales_leads
  for each row execute function public.set_updated_at();

alter table public.sales_leads enable row level security;

create policy "Platform admin beheert sales pipeline"
  on public.sales_leads
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
