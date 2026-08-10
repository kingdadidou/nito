grant select (registrations_closed) on public.trips to anon, authenticated;
grant select (cancellation_reason,cancelled_at) on public.trips to authenticated;
grant update (title,description,location,date,start_time,duration,maximum_participants,equipment,registrations_closed,cancellation_reason,cancelled_at,status)
  on public.trips to authenticated;
