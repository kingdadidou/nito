create table public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id,blocked_id),
  check (blocker_id<>blocked_id)
);
alter table public.user_blocks enable row level security;
create policy "users read own blocks" on public.user_blocks for select to authenticated using (blocker_id=(select auth.uid()));
create policy "users create own blocks" on public.user_blocks for insert to authenticated with check (blocker_id=(select auth.uid()));
create policy "users remove own blocks" on public.user_blocks for delete to authenticated using (blocker_id=(select auth.uid()));

create or replace function private.can_send_message(p_sender uuid,p_receiver uuid,p_trip uuid,p_content text)
returns boolean language plpgsql security definer set search_path='' stable as $$
declare has_booking boolean; contains_contact boolean;
begin
  if p_sender<>(select auth.uid()) or p_sender=p_receiver then return false; end if;
  if exists(select 1 from public.user_blocks where (blocker_id=p_sender and blocked_id=p_receiver) or (blocker_id=p_receiver and blocked_id=p_sender)) then return false; end if;
  contains_contact := p_content ~* '([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|https?://|www\.|(\+33|0)[ .-]?[1-9]([ .-]?[0-9]){8})';
  if not contains_contact then return true; end if;
  if p_trip is null then return false; end if;
  select exists(
    select 1 from public.bookings b join public.trips t on t.id=b.trip_id
    where b.trip_id=p_trip and b.booking_status in ('confirmee','terminee')
      and ((b.participant_id=p_sender and t.organizer_id=p_receiver) or (b.participant_id=p_receiver and t.organizer_id=p_sender))
  ) into has_booking;
  return has_booking;
end $$;
revoke all on function private.can_send_message(uuid,uuid,uuid,text) from public;
grant execute on function private.can_send_message(uuid,uuid,uuid,text) to authenticated;

drop policy if exists "members send messages" on public.messages;
create policy "members send allowed messages" on public.messages for insert to authenticated
  with check ((select private.can_send_message(sender_id,receiver_id,trip_id,content)));

create or replace function private.notify_new_message() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.notifications(user_id,type,title,content,data)
  values(new.receiver_id,'nouveau_message','Nouveau message',left(new.content,160),jsonb_build_object('message_id',new.id,'sender_id',new.sender_id,'trip_id',new.trip_id));
  return new;
end $$;
create trigger messages_create_notification after insert on public.messages for each row execute function private.notify_new_message();

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

create policy "message members insert attachments" on public.message_attachments for insert to authenticated
  with check (exists(select 1 from public.messages m where m.id=message_id and m.sender_id=(select auth.uid())));

