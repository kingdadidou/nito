-- Parcours d'inscription et onboarding organisateur.
create type public.signup_intent as enum ('participer', 'organiser', 'les_deux');
create type public.onboarding_status as enum ('a_completer', 'en_verification', 'valide', 'refuse');

alter table public.profiles
  add column signup_intent public.signup_intent not null default 'participer';

create table public.organizer_profiles (
  organizer_id uuid primary key references public.profiles(id) on delete cascade,
  skills text[] not null default '{}',
  insurance_provider text,
  insurance_policy_number text,
  insurance_expires_at date,
  stripe_connect_account_id text unique,
  stripe_charges_enabled boolean not null default false,
  stripe_payouts_enabled boolean not null default false,
  onboarding_status public.onboarding_status not null default 'a_completer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_activities (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  experience_description text check (char_length(experience_description) <= 2000),
  created_at timestamptz not null default now(),
  primary key (profile_id, activity_id)
);

create trigger organizer_profiles_updated_at before update on public.organizer_profiles
for each row execute procedure public.set_updated_at();

alter table public.organizer_profiles enable row level security;
alter table public.profile_activities enable row level security;

create policy "organizer profile owner read" on public.organizer_profiles for select to authenticated
  using (organizer_id = auth.uid() or public.is_admin());
create policy "profile activities public read" on public.profile_activities for select
  using (true);

-- Remplace le trigger initial : les métadonnées ne peuvent jamais attribuer le rôle administrateur.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  requested_intent public.signup_intent;
  initial_type public.user_type;
begin
  requested_intent := case new.raw_user_meta_data->>'signup_intent'
    when 'organiser' then 'organiser'::public.signup_intent
    when 'les_deux' then 'les_deux'::public.signup_intent
    else 'participer'::public.signup_intent
  end;
  initial_type := case when requested_intent = 'participer' then 'participant'::public.user_type else 'organisateur'::public.user_type end;
  insert into public.profiles (id,email,first_name,last_name,user_type,signup_intent,avatar_url)
  values (new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'first_name',''),coalesce(new.raw_user_meta_data->>'last_name',''),initial_type,requested_intent,new.raw_user_meta_data->>'avatar_url');
  if initial_type = 'organisateur' then insert into public.organizer_profiles (organizer_id) values (new.id); end if;
  return new;
end;
$$;

-- L'onboarding est atomique et n'accepte que l'utilisateur connecté.
create or replace function public.complete_organizer_onboarding(
  p_bio text, p_city text, p_skills text[], p_activity_ids uuid[],
  p_insurance_provider text default null, p_insurance_policy_number text default null,
  p_insurance_expires_at date default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if char_length(coalesce(p_bio,'')) < 40 then raise exception 'La biographie doit contenir au moins 40 caractères'; end if;
  if coalesce(array_length(p_activity_ids,1),0) = 0 then raise exception 'Sélectionnez au moins une activité'; end if;
  update public.profiles set bio=p_bio,city=p_city,user_type='organisateur',signup_intent=case when signup_intent='participer' then 'les_deux' else signup_intent end where id=auth.uid();
  insert into public.organizer_profiles (organizer_id,skills,insurance_provider,insurance_policy_number,insurance_expires_at,onboarding_status)
  values (auth.uid(),coalesce(p_skills,'{}'),p_insurance_provider,p_insurance_policy_number,p_insurance_expires_at,'en_verification')
  on conflict (organizer_id) do update set skills=excluded.skills,insurance_provider=excluded.insurance_provider,insurance_policy_number=excluded.insurance_policy_number,insurance_expires_at=excluded.insurance_expires_at,onboarding_status='en_verification';
  delete from public.profile_activities where profile_id=auth.uid();
  insert into public.profile_activities(profile_id,activity_id) select auth.uid(),unnest(p_activity_ids);
end;
$$;

revoke all on function public.complete_organizer_onboarding(text,text,text[],uuid[],text,text,date) from public;
grant execute on function public.complete_organizer_onboarding(text,text,text[],uuid[],text,text,date) to authenticated;
grant select (signup_intent) on public.profiles to authenticated;
