create table if not exists public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  recipient_user_id uuid references public.profiles(id) on delete set null,
  recipient_email text not null,
  template text not null,
  provider_message_id text,
  status text not null default 'en_attente' check (status in ('en_attente','envoye','echoue','ignore')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists email_deliveries_created_idx on public.email_deliveries(created_at desc);
alter table public.email_deliveries enable row level security;
revoke all on public.email_deliveries from anon,authenticated;
create policy "admins read email deliveries" on public.email_deliveries for select to authenticated using ((select private.is_admin()));
grant select on public.email_deliveries to authenticated;
