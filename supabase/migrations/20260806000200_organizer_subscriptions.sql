-- Abonnements gratuits des participants aux organisateurs.
create table public.organizer_subscriptions (
  participant_id uuid not null references public.profiles(id) on delete cascade,
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (participant_id, organizer_id),
  check (participant_id <> organizer_id)
);

create index organizer_subscriptions_organizer_idx on public.organizer_subscriptions (organizer_id, created_at desc);
alter table public.organizer_subscriptions enable row level security;

create policy "participants read own subscriptions" on public.organizer_subscriptions for select to authenticated
  using (participant_id=(select auth.uid()) or organizer_id=(select auth.uid()) or (select private.is_admin()));
create policy "participants follow organizers" on public.organizer_subscriptions for insert to authenticated
  with check (
    participant_id=(select auth.uid())
    and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.user_type='participant')
    and exists(select 1 from public.profiles o where o.id=organizer_id and o.user_type in ('organisateur','administrateur'))
  );
create policy "participants unfollow organizers" on public.organizer_subscriptions for delete to authenticated
  using (participant_id=(select auth.uid()));

create or replace function public.notify_organizer_followers() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status='publiee' and old.status is distinct from 'publiee' then
    insert into public.notifications(user_id,type,title,content,data)
    select s.participant_id,'nouvelle_sortie_organisateur','Nouvelle sortie publiée',new.title,
      jsonb_build_object('trip_id',new.id,'organizer_id',new.organizer_id)
    from public.organizer_subscriptions s where s.organizer_id=new.organizer_id;
  end if;
  return new;
end;
$$;

create trigger notify_organizer_followers
after update of status on public.trips
for each row execute procedure public.notify_organizer_followers();
