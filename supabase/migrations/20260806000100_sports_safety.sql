-- Qualification et assurance des organisateurs proposant un encadrement sportif rémunéré.
create type public.organizer_level as enum (
  'passionne_verifie',
  'association',
  'professionnel_diplome',
  'guide_educateur_sportif'
);

create type public.trip_offer_type as enum (
  'rencontre_gratuite',
  'experience_payante',
  'encadrement_sportif_remunere'
);

alter table public.organizer_profiles
  add column organizer_level public.organizer_level not null default 'passionne_verifie',
  add column affiliation_name text,
  add column qualification_verified boolean not null default false,
  add column insurance_verified boolean not null default false;

alter table public.trips
  add column offer_type public.trip_offer_type not null default 'rencontre_gratuite';

update public.trips
set offer_type = case when price = 0 then 'rencontre_gratuite'::public.trip_offer_type else 'experience_payante'::public.trip_offer_type end;

alter table public.trips add constraint trips_offer_price_consistency check (
  (offer_type = 'rencontre_gratuite' and price = 0)
  or (offer_type <> 'rencontre_gratuite' and price > 0)
);

create or replace function public.enforce_paid_sports_qualification() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.offer_type = 'encadrement_sportif_remunere' and not exists (
    select 1 from public.organizer_profiles op
    where op.organizer_id = new.organizer_id
      and op.organizer_level in ('professionnel_diplome', 'guide_educateur_sportif')
      and op.qualification_verified
      and op.insurance_verified
  ) then
    raise exception 'Qualification professionnelle et assurance vérifiées requises pour un encadrement sportif rémunéré';
  end if;
  return new;
end;
$$;

create trigger enforce_paid_sports_qualification
before insert or update of organizer_id, offer_type, price on public.trips
for each row execute procedure public.enforce_paid_sports_qualification();

drop function if exists public.complete_organizer_onboarding(text,text,text[],uuid[],text,text,date);
create function public.complete_organizer_onboarding(
  p_bio text, p_city text, p_skills text[], p_activity_ids uuid[],
  p_organizer_level public.organizer_level,
  p_affiliation_name text default null,
  p_insurance_provider text default null, p_insurance_policy_number text default null,
  p_insurance_expires_at date default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if char_length(coalesce(p_bio,'')) < 40 then raise exception 'La biographie doit contenir au moins 40 caractères'; end if;
  if coalesce(array_length(p_activity_ids,1),0) = 0 then raise exception 'Sélectionnez au moins une activité'; end if;
  update public.profiles set bio=p_bio,city=p_city,user_type='organisateur',signup_intent=case when signup_intent='participer' then 'les_deux' else signup_intent end where id=auth.uid();
  insert into public.organizer_profiles (organizer_id,skills,organizer_level,affiliation_name,insurance_provider,insurance_policy_number,insurance_expires_at,onboarding_status)
  values (auth.uid(),coalesce(p_skills,'{}'),p_organizer_level,nullif(p_affiliation_name,''),p_insurance_provider,p_insurance_policy_number,p_insurance_expires_at,'en_verification')
  on conflict (organizer_id) do update set skills=excluded.skills,organizer_level=excluded.organizer_level,affiliation_name=excluded.affiliation_name,insurance_provider=excluded.insurance_provider,insurance_policy_number=excluded.insurance_policy_number,insurance_expires_at=excluded.insurance_expires_at,onboarding_status='en_verification';
  delete from public.profile_activities where profile_id=auth.uid();
  insert into public.profile_activities(profile_id,activity_id) select auth.uid(),unnest(p_activity_ids);
end;
$$;

revoke all on function public.complete_organizer_onboarding(text,text,text[],uuid[],public.organizer_level,text,text,text,date) from public;
grant execute on function public.complete_organizer_onboarding(text,text,text[],uuid[],public.organizer_level,text,text,text,date) to authenticated;
grant select (organizer_level, affiliation_name, qualification_verified, insurance_verified) on public.organizer_profiles to authenticated;
