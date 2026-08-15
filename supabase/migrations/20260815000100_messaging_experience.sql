-- Lecture des groupes et pièces jointes privées de groupe.
alter table public.trip_group_members add column if not exists last_read_at timestamptz not null default now();

drop policy if exists "members update own group reading" on public.trip_group_members;
create policy "members update own group reading" on public.trip_group_members for update to authenticated
  using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
grant update(last_read_at) on public.trip_group_members to authenticated;

create table if not exists public.trip_group_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.trip_group_messages(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  created_at timestamptz not null default now()
);
alter table public.trip_group_message_attachments enable row level security;
drop policy if exists "group members read attachments" on public.trip_group_message_attachments;
create policy "group members read attachments" on public.trip_group_message_attachments for select to authenticated
  using (exists(select 1 from public.trip_group_messages gm where gm.id=message_id and (select private.is_trip_group_member(gm.trip_id,(select auth.uid())))));
drop policy if exists "group senders insert attachments" on public.trip_group_message_attachments;
create policy "group senders insert attachments" on public.trip_group_message_attachments for insert to authenticated
  with check (exists(select 1 from public.trip_group_messages gm where gm.id=message_id and gm.sender_id=(select auth.uid())));
grant select,insert on public.trip_group_message_attachments to authenticated;

create index if not exists trip_group_attachments_message_idx on public.trip_group_message_attachments(message_id);
