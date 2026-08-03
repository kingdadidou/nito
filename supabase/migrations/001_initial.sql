-- NaturEnsemble — schéma initial Supabase/PostgreSQL
create extension if not exists pgcrypto;

create type public.user_type as enum ('participant', 'organisateur', 'administrateur');
create type public.trip_status as enum ('brouillon', 'en_attente', 'publiee', 'refusee', 'annulee', 'terminee');
create type public.difficulty_level as enum ('debutant', 'intermediaire', 'avance', 'expert');
create type public.payment_status as enum ('en_attente', 'paye', 'echoue', 'rembourse_partiel', 'rembourse');
create type public.booking_status as enum ('en_attente', 'confirmee', 'annulee', 'terminee');
create type public.report_status as enum ('ouvert', 'en_cours', 'resolu', 'rejete');
create type public.verification_status as enum ('non_soumis', 'en_attente', 'verifie', 'rejete');
create type public.payout_status as enum ('en_attente', 'en_cours', 'paye', 'echoue');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  first_name text not null default '', last_name text not null default '',
  avatar_url text, bio text check (char_length(bio) <= 2000), city text,
  user_type public.user_type not null default 'participant',
  identity_verified boolean not null default false,
  average_rating numeric(3,2) not null default 0 check (average_rating between 0 and 5),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(), name text not null unique,
  icon text not null, description text not null default '', created_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(), organizer_id uuid not null references public.profiles(id) on delete restrict,
  activity_id uuid not null references public.activities(id) on delete restrict,
  title text not null check (char_length(title) between 5 and 140), description text not null check (char_length(description) between 20 and 10000),
  location text not null, latitude numeric(9,6) check (latitude between -90 and 90), longitude numeric(9,6) check (longitude between -180 and 180),
  meeting_point text not null, date date not null, start_time time not null, duration integer not null check (duration > 0),
  difficulty public.difficulty_level not null default 'debutant', maximum_participants integer not null check (maximum_participants between 1 and 100),
  price numeric(10,2) not null default 0 check (price >= 0), equipment text,
  children_allowed boolean not null default false, pets_allowed boolean not null default false,
  status public.trip_status not null default 'en_attente', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete restrict,
  participant_id uuid not null references public.profiles(id) on delete restrict,
  number_of_people integer not null default 1 check (number_of_people between 1 and 20),
  amount numeric(10,2) not null check (amount >= 0), platform_fee numeric(10,2) not null default 0 check (platform_fee >= 0),
  stripe_payment_id text unique, payment_status public.payment_status not null default 'en_attente',
  booking_status public.booking_status not null default 'en_attente', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (trip_id, participant_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict, recipient_id uuid not null references public.profiles(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5), comment text check (char_length(comment) <= 4000), created_at timestamptz not null default now(),
  check (author_id <> recipient_id), unique (trip_id, author_id, recipient_id)
);

create table public.messages (
  id bigint generated always as identity primary key, sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade, trip_id uuid references public.trips(id) on delete set null,
  content text not null check (char_length(content) between 1 and 4000), read_at timestamptz, created_at timestamptz not null default now(),
  check (sender_id <> receiver_id)
);

create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade, trip_id uuid not null references public.trips(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (user_id, trip_id)
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null, title text not null, content text not null, data jsonb not null default '{}'::jsonb,
  read_at timestamptz, created_at timestamptz not null default now()
);
create table public.reports (
  id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles(id) on delete restrict,
  reported_user_id uuid references public.profiles(id) on delete set null, trip_id uuid references public.trips(id) on delete set null,
  reason text not null, details text, status public.report_status not null default 'ouvert', handled_by uuid references public.profiles(id), created_at timestamptz not null default now(), resolved_at timestamptz,
  check (reported_user_id is not null or trip_id is not null)
);
create table public.identity_checks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null, provider_check_id text unique, status public.verification_status not null default 'non_soumis',
  submitted_at timestamptz, verified_at timestamptz, created_at timestamptz not null default now()
);
create table public.organizer_documents (
  id uuid primary key default gen_random_uuid(), organizer_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null, storage_path text not null unique, status public.verification_status not null default 'en_attente',
  reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, created_at timestamptz not null default now()
);
create table public.refunds (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id) on delete restrict,
  stripe_refund_id text unique, amount numeric(10,2) not null check (amount > 0), reason text,
  status public.payment_status not null default 'en_attente', created_at timestamptz not null default now()
);
create table public.payouts (
  id uuid primary key default gen_random_uuid(), organizer_id uuid not null references public.profiles(id) on delete restrict,
  trip_id uuid references public.trips(id) on delete set null, stripe_payout_id text unique,
  amount numeric(10,2) not null check (amount > 0), status public.payout_status not null default 'en_attente', created_at timestamptz not null default now(), paid_at timestamptz
);

create index trips_public_search_idx on public.trips (status, date, activity_id);
create index trips_organizer_idx on public.trips (organizer_id, date desc);
create index bookings_participant_idx on public.bookings (participant_id, created_at desc);
create index bookings_trip_idx on public.bookings (trip_id, booking_status);
create index messages_sender_idx on public.messages (sender_id, created_at desc);
create index messages_receiver_idx on public.messages (receiver_id, created_at desc);
create index notifications_user_idx on public.notifications (user_id, read_at, created_at desc);

insert into public.activities (name, icon, description) values
  ('Ornithologie','🦉','Observation et identification des oiseaux.'), ('Escalade','🧗','Initiation et sorties sur blocs ou falaises.'),
  ('Randonnée','🥾','Balades et itinéraires pédestres en pleine nature.'), ('Botanique','🌿','Découverte des plantes et des écosystèmes.'),
  ('Astronomie','🔭','Observation du ciel et découverte des étoiles.'), ('Canoë','🛶','Sorties nature sur rivières et plans d’eau.'),
  ('Photographie nature','📷','Pratique de la photographie de paysages et de faune.');

create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and user_type = 'administrateur');
$$;
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id,email,first_name,last_name) values (new.id,new.email,coalesce(new.raw_user_meta_data->>'first_name',''),coalesce(new.raw_user_meta_data->>'last_name','')); return new; end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create function public.protect_trip_moderation() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and not public.is_admin() then raise exception 'Seul un administrateur peut modifier le statut de modération'; end if;
  return new;
end;
$$;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger trips_updated_at before update on public.trips for each row execute procedure public.set_updated_at();
create trigger bookings_updated_at before update on public.bookings for each row execute procedure public.set_updated_at();
create trigger protect_trip_status before update on public.trips for each row execute procedure public.protect_trip_moderation();

alter table public.profiles enable row level security; alter table public.activities enable row level security; alter table public.trips enable row level security;
alter table public.bookings enable row level security; alter table public.reviews enable row level security; alter table public.messages enable row level security;
alter table public.favorites enable row level security; alter table public.notifications enable row level security; alter table public.reports enable row level security;
alter table public.identity_checks enable row level security; alter table public.organizer_documents enable row level security; alter table public.refunds enable row level security; alter table public.payouts enable row level security;

create policy "activities public read" on public.activities for select using (true);
create policy "public profile fields read" on public.profiles for select to anon, authenticated using (true);
create policy "profiles own update" on public.profiles for update to authenticated using (id=auth.uid() or public.is_admin()) with check (id=auth.uid() or public.is_admin());
create policy "published trips public read" on public.trips for select using (status='publiee' or organizer_id=auth.uid() or public.is_admin());
create policy "organizers create trips" on public.trips for insert to authenticated with check (organizer_id=auth.uid() and status in ('brouillon','en_attente') and exists(select 1 from public.profiles where id=auth.uid() and user_type in ('organisateur','administrateur')));
create policy "organizers update own trips" on public.trips for update to authenticated using (organizer_id=auth.uid() or public.is_admin()) with check (organizer_id=auth.uid() or public.is_admin());
create policy "booking parties read" on public.bookings for select to authenticated using (participant_id=auth.uid() or exists(select 1 from public.trips where id=trip_id and organizer_id=auth.uid()) or public.is_admin());
-- Les réservations sont créées par une route serveur après calcul du montant et confirmation Stripe.
create policy "reviews public read" on public.reviews for select using (true);
create policy "booked participants review" on public.reviews for insert to authenticated with check (author_id=auth.uid() and exists(select 1 from public.bookings where trip_id=reviews.trip_id and participant_id=auth.uid() and booking_status='terminee'));
create policy "message parties read" on public.messages for select to authenticated using (sender_id=auth.uid() or receiver_id=auth.uid() or public.is_admin());
create policy "users send messages" on public.messages for insert to authenticated with check (sender_id=auth.uid());
create policy "receiver marks read" on public.messages for update to authenticated using (receiver_id=auth.uid()) with check (receiver_id=auth.uid());
create policy "favorites own all" on public.favorites for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "notifications own read" on public.notifications for select to authenticated using (user_id=auth.uid() or public.is_admin());
create policy "notifications own update" on public.notifications for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "users create reports" on public.reports for insert to authenticated with check (reporter_id=auth.uid());
create policy "reports own or admin read" on public.reports for select to authenticated using (reporter_id=auth.uid() or public.is_admin());
create policy "admins manage reports" on public.reports for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "identity own or admin read" on public.identity_checks for select to authenticated using (user_id=auth.uid() or public.is_admin());
create policy "documents owner or admin read" on public.organizer_documents for select to authenticated using (organizer_id=auth.uid() or public.is_admin());
create policy "organizers upload documents" on public.organizer_documents for insert to authenticated with check (organizer_id=auth.uid());
create policy "refund parties read" on public.refunds for select to authenticated using (exists(select 1 from public.bookings b join public.trips t on t.id=b.trip_id where b.id=booking_id and (b.participant_id=auth.uid() or t.organizer_id=auth.uid())) or public.is_admin());
create policy "payout owner read" on public.payouts for select to authenticated using (organizer_id=auth.uid() or public.is_admin());

-- Vue publique exécutée avec les droits de l'appelant et sans donnée sensible.
create view public.public_profiles with (security_invoker=true) as
  select id,first_name,last_name,avatar_url,bio,city,user_type,identity_verified,average_rating,created_at
  from public.profiles;
revoke all on public.public_profiles from public;
grant select on public.public_profiles to anon, authenticated;

-- Même avec la politique de lecture publique, l'e-mail reste inaccessible via l'API.
revoke select on public.profiles from anon, authenticated;
grant select (id, first_name, last_name, avatar_url, bio, city, user_type, identity_verified, average_rating, created_at, updated_at)
  on public.profiles to anon, authenticated;

-- Un utilisateur peut modifier son profil public, jamais son rôle, sa vérification ou sa note.
revoke update on public.profiles from authenticated;
grant update (first_name, last_name, avatar_url, bio, city) on public.profiles to authenticated;
