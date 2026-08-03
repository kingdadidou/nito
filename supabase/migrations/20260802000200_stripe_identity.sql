-- Stripe Identity: only references and statuses are stored, never document images.
alter table public.identity_checks
  add column if not exists last_error_code text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists identity_checks_user_created_idx
  on public.identity_checks(user_id, created_at desc);

drop trigger if exists identity_checks_updated_at on public.identity_checks;
create trigger identity_checks_updated_at before update on public.identity_checks
for each row execute procedure public.set_updated_at();

revoke insert, update, delete on public.identity_checks from anon, authenticated;

