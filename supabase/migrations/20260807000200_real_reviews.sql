alter table public.reviews
  add column if not exists moderation_status text not null default 'publie' check (moderation_status in ('publie','masque')),
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references public.profiles(id) on delete set null;

alter table public.reports add column if not exists review_id uuid references public.reviews(id) on delete set null;
alter table public.reports drop constraint if exists reports_target_required;
alter table public.reports add constraint reports_target_required check (reported_user_id is not null or trip_id is not null or review_id is not null);
create index if not exists reviews_recipient_public_idx on public.reviews (recipient_id,created_at desc) where moderation_status='publie';
create unique index if not exists one_open_report_per_review on public.reports (reporter_id,review_id) where review_id is not null and status in ('ouvert','en_cours');

drop policy if exists "reviews public read" on public.reviews;
drop policy if exists "completed participants review" on public.reviews;
drop policy if exists "authors update own reviews" on public.reviews;
create policy "published reviews public read" on public.reviews for select to anon,authenticated using (moderation_status='publie' or author_id=(select auth.uid()) or (select private.is_admin()));
create policy "eligible participants review" on public.reviews for insert to authenticated with check (
  author_id=(select auth.uid()) and author_id<>recipient_id and moderation_status='publie' and exists (
    select 1 from public.bookings b join public.trips t on t.id=b.trip_id
    where b.trip_id=reviews.trip_id and b.participant_id=(select auth.uid()) and b.booking_status in ('confirmee','terminee')
      and t.organizer_id=reviews.recipient_id and (t.date+t.start_time)<now()
  )
);

create or replace function public.refresh_profile_average_rating() returns trigger language plpgsql security definer set search_path=public as $$
declare target uuid;
begin
  if tg_op='DELETE' then target=old.recipient_id; else target=new.recipient_id; end if;
  update public.profiles p set average_rating=coalesce((select round(avg(r.rating)::numeric,2) from public.reviews r where r.recipient_id=target and r.moderation_status='publie'),0) where p.id=target;
  if tg_op='UPDATE' and old.recipient_id<>new.recipient_id then
    update public.profiles p set average_rating=coalesce((select round(avg(r.rating)::numeric,2) from public.reviews r where r.recipient_id=old.recipient_id and r.moderation_status='publie'),0) where p.id=old.recipient_id;
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end $$;
drop trigger if exists refresh_average_rating on public.reviews;
create trigger refresh_average_rating after insert or update or delete on public.reviews for each row execute function public.refresh_profile_average_rating();
update public.profiles p set average_rating=coalesce((select round(avg(r.rating)::numeric,2) from public.reviews r where r.recipient_id=p.id and r.moderation_status='publie'),0);
grant select,insert on public.reviews to authenticated;
grant select on public.reviews to anon;
grant insert on public.reports to authenticated;
