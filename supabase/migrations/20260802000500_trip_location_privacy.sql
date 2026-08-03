alter table public.trips
  add column approximate_latitude numeric(5,2) generated always as (round(latitude,2)) stored,
  add column approximate_longitude numeric(5,2) generated always as (round(longitude,2)) stored;

-- Exact coordinates and meeting instructions cannot be selected through the public API.
revoke select on public.trips from anon, authenticated;
grant select (id,organizer_id,activity_id,title,description,location,approximate_latitude,approximate_longitude,date,start_time,duration,difficulty,maximum_participants,price,equipment,children_allowed,pets_allowed,status,created_at,updated_at)
  on public.trips to anon, authenticated;

create or replace function public.get_exact_trip_location(p_trip_id uuid)
returns table(latitude numeric,longitude numeric,meeting_point text)
language sql security definer set search_path='' stable as $$
  select t.latitude,t.longitude,t.meeting_point from public.trips t
  where t.id=p_trip_id and (
    t.organizer_id=(select auth.uid()) or (select private.is_admin()) or exists(
      select 1 from public.bookings b where b.trip_id=t.id and b.participant_id=(select auth.uid()) and b.booking_status in ('confirmee','terminee')
    )
  );
$$;
revoke all on function public.get_exact_trip_location(uuid) from public;
grant execute on function public.get_exact_trip_location(uuid) to authenticated;

