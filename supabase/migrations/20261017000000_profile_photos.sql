begin;

alter table public.profiles
  add column avatar_path text
  check (avatar_path is null or avatar_path like id::text || '/%');

grant update(avatar_path) on public.profiles to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values(
  'profile-photos',
  'profile-photos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Profile photos are visible to owner and partner"
on storage.objects for select
to authenticated
using (
  bucket_id = 'profile-photos'
  and exists(
    select 1
    from public.profiles profile
    where profile.id::text = (storage.foldername(name))[1]
      and (profile.id = auth.uid() or public.shares_couple_with(profile.id))
  )
);

create policy "Users upload their profile photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users delete their profile photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
