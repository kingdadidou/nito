create or replace function private.is_trip_group_member(p_trip_id uuid,p_user_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.trip_group_members where trip_id=p_trip_id and user_id=p_user_id and left_at is null)
$$;
revoke all on function private.is_trip_group_member(uuid,uuid) from public;
grant execute on function private.is_trip_group_member(uuid,uuid) to authenticated;

drop policy if exists "members read their trip groups" on public.trip_group_members;
create policy "members read their trip groups" on public.trip_group_members for select to authenticated
  using (user_id=(select auth.uid()) or (select private.is_trip_group_member(trip_id,(select auth.uid()))) or (select private.is_admin()));
drop policy if exists "members read group messages" on public.trip_group_messages;
create policy "members read group messages" on public.trip_group_messages for select to authenticated
  using ((select private.is_trip_group_member(trip_id,(select auth.uid()))) or (select private.is_admin()));
drop policy if exists "members send group messages" on public.trip_group_messages;
create policy "members send group messages" on public.trip_group_messages for insert to authenticated
  with check (sender_id=(select auth.uid()) and (select private.is_trip_group_member(trip_id,(select auth.uid()))));
