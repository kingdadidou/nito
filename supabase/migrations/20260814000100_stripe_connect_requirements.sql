-- Suivi détaillé des exigences Stripe Connect pour assister les organisateurs.
alter table public.organizer_profiles
  add column if not exists stripe_details_submitted boolean not null default false,
  add column if not exists stripe_requirements_currently_due text[] not null default '{}',
  add column if not exists stripe_requirements_eventually_due text[] not null default '{}',
  add column if not exists stripe_disabled_reason text,
  add column if not exists stripe_requirements_deadline timestamptz,
  add column if not exists stripe_requirements_digest text not null default '';
