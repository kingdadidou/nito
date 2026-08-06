-- Outils d'exploitation : suspension des comptes et journal administratif.
create type public.account_status as enum ('actif','suspendu');

alter table public.profiles
  add column account_status public.account_status not null default 'actif',
  add column suspension_reason text,
  add column suspended_at timestamptz,
  add column suspended_by uuid references public.profiles(id) on delete set null;

create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  admin_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc);
alter table public.admin_audit_logs enable row level security;
create policy "admins read audit logs" on public.admin_audit_logs for select to authenticated using ((select private.is_admin()));

create or replace function public.current_account_status() returns public.account_status
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select account_status from public.profiles where id=(select auth.uid())),'actif'::public.account_status);
$$;
revoke all on function public.current_account_status() from public, anon;
grant execute on function public.current_account_status() to authenticated;
