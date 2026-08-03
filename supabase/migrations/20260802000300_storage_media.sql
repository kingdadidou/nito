-- Public display media and strictly private organizer/message documents.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values
  ('insurance-documents','insurance-documents',false,10485760,array['application/pdf','image/jpeg','image/png']),
  ('professional-documents','professional-documents',false,10485760,array['application/pdf','image/jpeg','image/png']),
  ('message-attachments','message-attachments',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create table public.trip_images (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  storage_path text not null unique,
  public_url text not null,
  alt_text text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id bigint not null references public.messages(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  created_at timestamptz not null default now()
);

alter table public.trip_images enable row level security;
alter table public.message_attachments enable row level security;
create policy "published trip images are public" on public.trip_images for select using (exists(select 1 from public.trips t where t.id=trip_id and (t.status='publiee' or t.organizer_id=(select auth.uid()))));
create policy "organizers manage own trip images" on public.trip_images for all to authenticated using (exists(select 1 from public.trips t where t.id=trip_id and t.organizer_id=(select auth.uid()))) with check (exists(select 1 from public.trips t where t.id=trip_id and t.organizer_id=(select auth.uid())));
create policy "conversation members read attachments" on public.message_attachments for select to authenticated using (exists(select 1 from public.messages m where m.id=message_id and (m.sender_id=(select auth.uid()) or m.receiver_id=(select auth.uid()))));

create policy "organizers upload insurance documents" on storage.objects for insert to authenticated with check (bucket_id='insurance-documents' and (storage.foldername(name))[1]=(select auth.uid()::text));
create policy "owners read insurance documents" on storage.objects for select to authenticated using (bucket_id='insurance-documents' and ((storage.foldername(name))[1]=(select auth.uid()::text) or (select private.is_admin())));
create policy "owners delete insurance documents" on storage.objects for delete to authenticated using (bucket_id='insurance-documents' and owner_id=(select auth.uid()::text));
create policy "organizers upload professional documents" on storage.objects for insert to authenticated with check (bucket_id='professional-documents' and (storage.foldername(name))[1]=(select auth.uid()::text));
create policy "owners read professional documents" on storage.objects for select to authenticated using (bucket_id='professional-documents' and ((storage.foldername(name))[1]=(select auth.uid()::text) or (select private.is_admin())));
create policy "owners delete professional documents" on storage.objects for delete to authenticated using (bucket_id='professional-documents' and owner_id=(select auth.uid()::text));
create policy "users upload message attachments" on storage.objects for insert to authenticated with check (bucket_id='message-attachments' and (storage.foldername(name))[1]=(select auth.uid()::text));
