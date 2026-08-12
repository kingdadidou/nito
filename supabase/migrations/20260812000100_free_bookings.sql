-- Une réservation gratuite est confirmée atomiquement, sans dépendance à Stripe.
create or replace function public.reserve_free_trip(p_trip_id uuid, p_number_of_people integer default 1)
returns table(booking_id uuid, trip_title text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare selected_trip public.trips%rowtype; reserved_places integer; result_booking_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
  if p_number_of_people < 1 or p_number_of_people > 20 then raise exception 'Nombre de participants invalide'; end if;
  select * into selected_trip from public.trips where id=p_trip_id for update;
  if not found or selected_trip.status<>'publiee' or selected_trip.registrations_closed then raise exception 'Inscriptions fermées'; end if;
  if selected_trip.price<>0 then raise exception 'Cette sortie n''est pas gratuite'; end if;
  if (selected_trip.date+selected_trip.start_time)<=now() then raise exception 'Cette sortie a déjà commencé'; end if;
  if selected_trip.organizer_id=(select auth.uid()) then raise exception 'Un organisateur ne peut pas réserver sa propre sortie'; end if;
  select coalesce(sum(number_of_people),0) into reserved_places from public.bookings
    where trip_id=p_trip_id and booking_status in ('confirmee','terminee') and participant_id<>(select auth.uid());
  if reserved_places+p_number_of_people>selected_trip.maximum_participants then raise exception 'Nombre de places insuffisant'; end if;
  insert into public.bookings(trip_id,participant_id,number_of_people,amount,platform_fee,payment_status,booking_status,cancellation_reason,cancelled_at)
  values(p_trip_id,(select auth.uid()),p_number_of_people,0,0,'paye','confirmee',null,null)
  on conflict(trip_id,participant_id) do update set number_of_people=excluded.number_of_people,amount=0,platform_fee=0,
    payment_status='paye',booking_status='confirmee',cancellation_reason=null,cancelled_at=null,updated_at=now()
  where public.bookings.booking_status='annulee' or (public.bookings.booking_status='en_attente' and public.bookings.payment_status in ('en_attente','echoue'))
  returning id into result_booking_id;
  if result_booking_id is null then raise exception 'Une réservation existe déjà pour cette sortie'; end if;
  return query select result_booking_id,selected_trip.title;
end;
$$;
revoke all on function public.reserve_free_trip(uuid,integer) from public, anon;
grant execute on function public.reserve_free_trip(uuid,integer) to authenticated;
