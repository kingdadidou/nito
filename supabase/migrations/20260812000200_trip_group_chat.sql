create table public.trip_group_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null check (member_role in ('organisateur','participant')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (trip_id,user_id)
);
create table public.trip_group_messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index trip_group_messages_trip_idx on public.trip_group_messages(trip_id,created_at);
alter table public.trip_group_members enable row level security;
alter table public.trip_group_messages enable row level security;

create policy "members read their trip groups" on public.trip_group_members for select to authenticated
  using (user_id=(select auth.uid()) or exists(select 1 from public.trip_group_members mine where mine.trip_id=trip_group_members.trip_id and mine.user_id=(select auth.uid()) and mine.left_at is null) or (select private.is_admin()));
create policy "members read group messages" on public.trip_group_messages for select to authenticated
  using (exists(select 1 from public.trip_group_members m where m.trip_id=trip_group_messages.trip_id and m.user_id=(select auth.uid()) and m.left_at is null) or (select private.is_admin()));
create policy "members send group messages" on public.trip_group_messages for insert to authenticated
  with check (sender_id=(select auth.uid()) and exists(select 1 from public.trip_group_members m where m.trip_id=trip_group_messages.trip_id and m.user_id=(select auth.uid()) and m.left_at is null));
grant select on public.trip_group_members to authenticated;
grant select,insert on public.trip_group_messages to authenticated;

create or replace function private.sync_trip_group_membership() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.booking_status in ('confirmee','terminee') then
    insert into public.trip_group_members(trip_id,user_id,member_role,left_at)
    values(new.trip_id,new.participant_id,'participant',null)
    on conflict(trip_id,user_id) do update set left_at=null,joined_at=case when public.trip_group_members.left_at is not null then now() else public.trip_group_members.joined_at end;
  elsif new.booking_status='annulee' then
    update public.trip_group_members set left_at=now() where trip_id=new.trip_id and user_id=new.participant_id and member_role='participant' and left_at is null;
  end if;
  return new;
end $$;
drop trigger if exists sync_trip_group_membership on public.bookings;
create trigger sync_trip_group_membership after insert or update of booking_status on public.bookings for each row execute function private.sync_trip_group_membership();

insert into public.trip_group_members(trip_id,user_id,member_role)
select id,organizer_id,'organisateur' from public.trips on conflict do nothing;
insert into public.trip_group_members(trip_id,user_id,member_role)
select trip_id,participant_id,'participant' from public.bookings where booking_status in ('confirmee','terminee') on conflict do nothing;

create or replace function private.add_trip_organizer_to_group() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.trip_group_members(trip_id,user_id,member_role) values(new.id,new.organizer_id,'organisateur') on conflict do nothing;return new;end $$;
create trigger add_trip_organizer_to_group after insert on public.trips for each row execute function private.add_trip_organizer_to_group();

create or replace function private.notify_group_message() returns trigger language plpgsql security definer set search_path='' as $$
declare trip_title text;
begin
  select title into trip_title from public.trips where id=new.trip_id;
  insert into public.notifications(user_id,type,title,content,data)
  select m.user_id,'nouveau_message_groupe','Nouveau message dans « '||trip_title||' »',left(new.content,160),jsonb_build_object('trip_id',new.trip_id,'group',true)
  from public.trip_group_members m where m.trip_id=new.trip_id and m.left_at is null and m.user_id<>new.sender_id;
  return new;
end $$;
create trigger notify_group_message after insert on public.trip_group_messages for each row execute function private.notify_group_message();

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='trip_group_messages') then alter publication supabase_realtime add table public.trip_group_messages; end if;
end $$;
