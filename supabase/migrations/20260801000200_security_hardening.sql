-- Durcissement RLS et Supabase Storage.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.profiles where id=(select auth.uid()) and user_type='administrateur');
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

create or replace function public.protect_trip_moderation() returns trigger
language plpgsql security definer set search_path = public, private, pg_temp as $$
begin
  if new.status is distinct from old.status and not private.is_admin() then
    raise exception 'Seul un administrateur peut modifier le statut de modération';
  end if;
  return new;
end;
$$;

-- PROFILS : chacun ne modifie que sa propre ligne. Les colonnes sensibles
-- restent exclues des privilèges UPDATE accordés aux utilisateurs.
drop policy if exists "profiles own update" on public.profiles;
create policy "users update own profile" on public.profiles for update to authenticated
  using ((select auth.uid())=id)
  with check ((select auth.uid())=id);

-- SORTIES : lecture publique des seules sorties publiées ; propriétaire et
-- administrateurs peuvent également voir celles en modération.
drop policy if exists "published trips public read" on public.trips;
drop policy if exists "organizers create trips" on public.trips;
drop policy if exists "organizers update own trips" on public.trips;
create policy "public reads published trips" on public.trips for select to anon, authenticated
  using (status='publiee' or organizer_id=(select auth.uid()) or (select private.is_admin()));
create policy "organizers create own trips" on public.trips for insert to authenticated
  with check (organizer_id=(select auth.uid()) and status in ('brouillon','en_attente') and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.user_type='organisateur'));
create policy "organizers update own trips" on public.trips for update to authenticated
  using (organizer_id=(select auth.uid())) with check (organizer_id=(select auth.uid()));
create policy "admins moderate trips" on public.trips for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "organizers delete own drafts" on public.trips for delete to authenticated
  using (organizer_id=(select auth.uid()) and status='brouillon');

-- RÉSERVATIONS : participant propriétaire, organisateur de la sortie et admin.
drop policy if exists "booking parties read" on public.bookings;
create policy "booking parties read" on public.bookings for select to authenticated
  using (participant_id=(select auth.uid()) or trip_id in (select t.id from public.trips t where t.organizer_id=(select auth.uid())) or (select private.is_admin()));

-- AVIS : lecture publique, création uniquement après une réservation terminée.
drop policy if exists "reviews public read" on public.reviews;
drop policy if exists "booked participants review" on public.reviews;
create policy "reviews public read" on public.reviews for select to anon, authenticated using (true);
create policy "completed participants review" on public.reviews for insert to authenticated
  with check (author_id=(select auth.uid()) and author_id<>recipient_id and exists(select 1 from public.bookings b where b.trip_id=reviews.trip_id and b.participant_id=(select auth.uid()) and b.booking_status='terminee'));
create policy "authors update own reviews" on public.reviews for update to authenticated
  using (author_id=(select auth.uid())) with check (author_id=(select auth.uid()));

-- MESSAGES : strictement l'expéditeur et le destinataire, jamais un tiers.
drop policy if exists "message parties read" on public.messages;
drop policy if exists "users send messages" on public.messages;
drop policy if exists "receiver marks read" on public.messages;
create policy "conversation members read" on public.messages for select to authenticated
  using ((select auth.uid()) in (sender_id,receiver_id));
create policy "members send messages" on public.messages for insert to authenticated
  with check (sender_id=(select auth.uid()) and receiver_id<>(select auth.uid()));
create policy "receiver marks message read" on public.messages for update to authenticated
  using (receiver_id=(select auth.uid())) with check (receiver_id=(select auth.uid()) and sender_id<>(select auth.uid()));

-- SIGNALEMENTS : les utilisateurs peuvent signaler mais seuls les admins lisent et traitent.
drop policy if exists "users create reports" on public.reports;
drop policy if exists "reports own or admin read" on public.reports;
drop policy if exists "admins manage reports" on public.reports;
create policy "authenticated users create reports" on public.reports for insert to authenticated
  with check (reporter_id=(select auth.uid()));
create policy "admins read reports" on public.reports for select to authenticated
  using ((select private.is_admin()));
create policy "admins update reports" on public.reports for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Remplace les références restantes à la fonction admin exposée.
drop policy if exists "notifications own read" on public.notifications;
create policy "notifications own read" on public.notifications for select to authenticated
  using (user_id=(select auth.uid()) or (select private.is_admin()));
drop policy if exists "identity own or admin read" on public.identity_checks;
create policy "identity owner or admin read" on public.identity_checks for select to authenticated
  using (user_id=(select auth.uid()) or (select private.is_admin()));
drop policy if exists "documents owner or admin read" on public.organizer_documents;
create policy "documents owner or admin read" on public.organizer_documents for select to authenticated
  using (organizer_id=(select auth.uid()) or (select private.is_admin()));
drop policy if exists "refund parties read" on public.refunds;
create policy "refund parties read" on public.refunds for select to authenticated
  using (exists(select 1 from public.bookings b join public.trips t on t.id=b.trip_id where b.id=booking_id and (b.participant_id=(select auth.uid()) or t.organizer_id=(select auth.uid()))) or (select private.is_admin()));
drop policy if exists "payout owner read" on public.payouts;
create policy "payout owner read" on public.payouts for select to authenticated
  using (organizer_id=(select auth.uid()) or (select private.is_admin()));
drop policy if exists "organizer profile owner read" on public.organizer_profiles;
create policy "organizer profile owner read" on public.organizer_profiles for select to authenticated
  using (organizer_id=(select auth.uid()) or (select private.is_admin()));

-- La fonction historique n'est plus nécessaire dans le schéma exposé.
drop function if exists public.is_admin();

-- Buckets : fichiers publics d'affichage et justificatifs strictement privés.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values
  ('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp']),
  ('trip-images','trip-images',true,10485760,array['image/jpeg','image/png','image/webp']),
  ('organizer-documents','organizer-documents',false,10485760,array['application/pdf','image/jpeg','image/png']),
  ('identity-documents','identity-documents',false,10485760,array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Chaque chemin commence par l'UUID du propriétaire : <user-id>/<fichier>.
create policy "users upload own avatars" on storage.objects for insert to authenticated
  with check (bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid()::text));
create policy "users update own avatars" on storage.objects for update to authenticated
  using (bucket_id='avatars' and owner_id=(select auth.uid()::text))
  with check (bucket_id='avatars' and owner_id=(select auth.uid()::text));
create policy "users delete own avatars" on storage.objects for delete to authenticated
  using (bucket_id='avatars' and owner_id=(select auth.uid()::text));

-- Chemin des images : <trip-id>/<fichier>, contrôlé contre le propriétaire de la sortie.
create policy "organizers upload own trip images" on storage.objects for insert to authenticated
  with check (bucket_id='trip-images' and exists(select 1 from public.trips t where t.id::text=(storage.foldername(name))[1] and t.organizer_id=(select auth.uid())));
create policy "organizers update own trip images" on storage.objects for update to authenticated
  using (bucket_id='trip-images' and exists(select 1 from public.trips t where t.id::text=(storage.foldername(name))[1] and t.organizer_id=(select auth.uid())))
  with check (bucket_id='trip-images' and exists(select 1 from public.trips t where t.id::text=(storage.foldername(name))[1] and t.organizer_id=(select auth.uid())));
create policy "organizers delete own trip images" on storage.objects for delete to authenticated
  using (bucket_id='trip-images' and exists(select 1 from public.trips t where t.id::text=(storage.foldername(name))[1] and t.organizer_id=(select auth.uid())));

create policy "organizers upload own documents" on storage.objects for insert to authenticated
  with check (bucket_id='organizer-documents' and (storage.foldername(name))[1]=(select auth.uid()::text));
create policy "organizer document access" on storage.objects for select to authenticated
  using (bucket_id='organizer-documents' and ((storage.foldername(name))[1]=(select auth.uid()::text) or (select private.is_admin())));
create policy "organizers delete own documents" on storage.objects for delete to authenticated
  using (bucket_id='organizer-documents' and owner_id=(select auth.uid()::text));

create policy "users upload own identity documents" on storage.objects for insert to authenticated
  with check (bucket_id='identity-documents' and (storage.foldername(name))[1]=(select auth.uid()::text));
create policy "identity document access" on storage.objects for select to authenticated
  using (bucket_id='identity-documents' and ((storage.foldername(name))[1]=(select auth.uid()::text) or (select private.is_admin())));
create policy "users delete own pending identity documents" on storage.objects for delete to authenticated
  using (bucket_id='identity-documents' and owner_id=(select auth.uid()::text));
