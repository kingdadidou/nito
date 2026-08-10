drop policy if exists "published and owned trips read" on public.trips;
drop policy if exists "published trips public read" on public.trips;

create policy "published trips public read"
on public.trips for select to anon, authenticated
using (status = 'publiee');

create policy "owners and admins read trips"
on public.trips for select to authenticated
using (organizer_id = (select auth.uid()) or (select private.is_admin()));

alter table public.trips
  add column if not exists registrations_closed boolean not null default false,
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_at timestamptz;

create index if not exists trips_public_open_idx
  on public.trips(status, registrations_closed, date);

create or replace function public.protect_trip_moderation() returns trigger
language plpgsql security definer set search_path = public, private, pg_temp as $$
begin
  if new.status is distinct from old.status
     and not private.is_admin()
     and not (old.organizer_id=(select auth.uid()) and new.status='annulee' and old.status in ('en_attente','publiee')) then
    raise exception 'Seul un administrateur peut modifier le statut de modération';
  end if;
  return new;
end;
$$;

create or replace function public.prepare_booking(p_trip_id uuid, p_number_of_people integer default 1)
returns table(booking_id uuid, amount numeric, platform_fee numeric, trip_title text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare selected_trip public.trips%rowtype; reserved_places integer; result_booking_id uuid; total_amount numeric(10,2); fee_amount numeric(10,2);
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
  if p_number_of_people < 1 or p_number_of_people > 20 then raise exception 'Nombre de participants invalide'; end if;
  select * into selected_trip from public.trips where id=p_trip_id for update;
  if not found or selected_trip.status<>'publiee' or selected_trip.registrations_closed then raise exception 'Inscriptions fermées'; end if;
  if selected_trip.date < current_date then raise exception 'Cette sortie est terminée'; end if;
  if selected_trip.organizer_id=(select auth.uid()) then raise exception 'Un organisateur ne peut pas réserver sa propre sortie'; end if;
  select coalesce(sum(number_of_people),0) into reserved_places from public.bookings where trip_id=p_trip_id and booking_status in ('en_attente','confirmee');
  if reserved_places+p_number_of_people>selected_trip.maximum_participants then raise exception 'Nombre de places insuffisant'; end if;
  total_amount:=round(selected_trip.price*p_number_of_people,2);fee_amount:=round(total_amount*0.10,2);
  insert into public.bookings(trip_id,participant_id,number_of_people,amount,platform_fee,payment_status,booking_status)
  values(p_trip_id,(select auth.uid()),p_number_of_people,total_amount,fee_amount,'en_attente','en_attente')
  on conflict(trip_id,participant_id) do update set number_of_people=excluded.number_of_people,amount=excluded.amount,platform_fee=excluded.platform_fee,updated_at=now()
    where public.bookings.payment_status in ('en_attente','echoue')
  returning id into result_booking_id;
  if result_booking_id is null then raise exception 'Une réservation existe déjà pour cette sortie'; end if;
  return query select result_booking_id,total_amount,fee_amount,selected_trip.title;
end;
$$;
