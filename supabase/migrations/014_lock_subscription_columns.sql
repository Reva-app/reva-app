-- Migratie 014: voorkomt dat gebruikers hun eigen abonnementsstatus wijzigen
-- via een directe Supabase API-aanroep.
--
-- Waarom: de RLS-policy op `settings` staat elke ingelogde gebruiker toe om
-- zijn eigen rij te updaten (auth.uid() = user_id), zonder kolom-niveau
-- restricties. De app zelf schrijft nooit naar plan_type / subscription_status /
-- subscription_source / subscription_expires_at / trial_start_date /
-- trial_end_date via een UPDATE (zie lib/db/mappers.ts → profileToSettings),
-- maar niets in de database weerhoudt een gebruiker ervan om deze kolommen
-- rechtstreeks via de Supabase REST/JS API te wijzigen — bijvoorbeeld door
-- zichzelf gratis Premium toe te kennen. Zolang SUBSCRIPTIONS_ENABLED = false
-- in lib/subscription.ts staat is dit onschadelijk, maar moet gefixt zijn
-- vóórdat abonnementen weer live gaan.
--
-- Deze trigger blokkeert UPDATEs aan deze kolommen tenzij uitgevoerd door de
-- service_role (bijv. een toekomstige Stripe/RevenueCat-webhook). De initiële
-- INSERT (trial-seeding bij eerste login, zie ensureUserProfileAndSettings)
-- blijft gewoon werken — alleen UPDATE wordt geblokkeerd.

create or replace function public.enforce_subscription_columns_readonly()
returns trigger
language plpgsql
as $$
begin
  if auth.role() <> 'service_role' and (
    new.plan_type               is distinct from old.plan_type or
    new.subscription_status     is distinct from old.subscription_status or
    new.subscription_source     is distinct from old.subscription_source or
    new.subscription_expires_at is distinct from old.subscription_expires_at or
    new.trial_start_date        is distinct from old.trial_start_date or
    new.trial_end_date          is distinct from old.trial_end_date
  ) then
    raise exception 'Wijzigen van abonnementsvelden is niet toegestaan voor gebruikers';
  end if;
  return new;
end;
$$;

drop trigger if exists settings_subscription_readonly on public.settings;
create trigger settings_subscription_readonly
  before update on public.settings
  for each row execute function public.enforce_subscription_columns_readonly();
