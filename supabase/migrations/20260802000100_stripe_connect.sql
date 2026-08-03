-- Stripe Connect : paiements, remboursements, litiges et idempotence webhook.
alter table public.bookings
  add column stripe_checkout_session_id text unique,
  add column stripe_payment_intent_id text unique,
  add column stripe_charge_id text unique,
  add column stripe_transfer_id text,
  add column stripe_application_fee_id text,
  add column payment_failure_reason text,
  add column cancelled_at timestamptz,
  add column cancellation_reason text;

alter table public.refunds
  add column requested_by uuid references public.profiles(id) on delete set null,
  add column reverse_transfer boolean not null default true,
  add column refund_application_fee boolean not null default true;

create table public.payment_disputes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  stripe_dispute_id text not null unique,
  stripe_charge_id text not null,
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'eur',
  reason text, status text not null,
  evidence_due_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.stripe_events (
  stripe_event_id text primary key,
  event_type text not null,
  livemode boolean not null,
  connected_account_id text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create trigger payment_disputes_updated_at before update on public.payment_disputes
for each row execute procedure public.set_updated_at();
alter table public.payment_disputes enable row level security;
alter table public.stripe_events enable row level security;
create policy "admins read payment disputes" on public.payment_disputes for select to authenticated
  using ((select private.is_admin()));

create or replace function public.prepare_booking(p_trip_id uuid, p_number_of_people integer default 1)
returns table(booking_id uuid, amount numeric, platform_fee numeric, trip_title text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  selected_trip public.trips%rowtype;
  reserved_places integer;
  result_booking_id uuid;
  total_amount numeric(10,2);
  fee_amount numeric(10,2);
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
  if p_number_of_people < 1 or p_number_of_people > 20 then raise exception 'Nombre de participants invalide'; end if;
  select * into selected_trip from public.trips where id=p_trip_id for update;
  if not found or selected_trip.status<>'publiee' then raise exception 'Sortie indisponible'; end if;
  if selected_trip.date < current_date then raise exception 'Cette sortie est terminée'; end if;
  if selected_trip.organizer_id=(select auth.uid()) then raise exception 'Un organisateur ne peut pas réserver sa propre sortie'; end if;
  select coalesce(sum(number_of_people),0) into reserved_places from public.bookings
    where trip_id=p_trip_id and booking_status in ('en_attente','confirmee');
  if reserved_places+p_number_of_people>selected_trip.maximum_participants then raise exception 'Nombre de places insuffisant'; end if;
  total_amount:=round(selected_trip.price*p_number_of_people,2);
  fee_amount:=round(total_amount*0.10,2);
  insert into public.bookings(trip_id,participant_id,number_of_people,amount,platform_fee,payment_status,booking_status)
  values(p_trip_id,(select auth.uid()),p_number_of_people,total_amount,fee_amount,'en_attente','en_attente')
  on conflict(trip_id,participant_id) do update set number_of_people=excluded.number_of_people,amount=excluded.amount,platform_fee=excluded.platform_fee,updated_at=now()
    where public.bookings.payment_status in ('en_attente','echoue')
  returning id into result_booking_id;
  if result_booking_id is null then raise exception 'Une réservation existe déjà pour cette sortie'; end if;
  return query select result_booking_id,total_amount,fee_amount,selected_trip.title;
end;
$$;
revoke all on function public.prepare_booking(uuid,integer) from public, anon;
grant execute on function public.prepare_booking(uuid,integer) to authenticated;

create index bookings_checkout_session_idx on public.bookings(stripe_checkout_session_id);
create index payment_disputes_booking_idx on public.payment_disputes(booking_id);
