begin;
alter table public.wishes
  add column description text not null default '' check (char_length(description) <= 2000),
  add column photos text[] not null default '{}' check (cardinality(photos) <= 3),
  add column created_by uuid references public.profiles(id) on delete set null,
  add column version integer not null default 1,
  add column updated_at timestamptz not null default now();
grant update (description, photos, list) on public.wishes to authenticated;

create table public.wish_comments (
  id uuid primary key default gen_random_uuid(),
  wish_id uuid not null references public.wishes(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index wish_comments_wish_idx on public.wish_comments(wish_id, created_at);
alter table public.wish_comments enable row level security;
create policy comments_read on public.wish_comments for select to authenticated
  using (public.is_couple_member(couple_id));
create policy comments_add on public.wish_comments for insert to authenticated
  with check (author_id = auth.uid() and public.is_couple_member(couple_id)
    and exists (select 1 from public.wishes w where w.id = wish_id and w.couple_id = wish_comments.couple_id));
create policy comments_delete on public.wish_comments for delete to authenticated
  using (author_id = auth.uid() and public.is_couple_member(couple_id));
grant select, insert, delete on public.wish_comments to authenticated;
alter publication supabase_realtime add table public.wish_comments;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wish-photos', 'wish-photos', false, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy wish_photos_read on storage.objects for select to authenticated using (
  bucket_id = 'wish-photos' and exists (select 1 from public.couple_members m
    where m.user_id = auth.uid() and m.couple_id::text = (storage.foldername(name))[1]));
create policy wish_photos_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'wish-photos' and (storage.foldername(name))[2] = auth.uid()::text
  and exists (select 1 from public.couple_members m
    where m.user_id = auth.uid() and m.couple_id::text = (storage.foldername(name))[1]));
-- Clients may only remove their own unattached uploads. Referenced photos are cleaned by the worker.
create policy wish_photos_remove_draft on storage.objects for delete to authenticated using (
  bucket_id = 'wish-photos' and (storage.foldername(name))[2] = auth.uid()::text
  and not exists (select 1 from public.wishes w where name = any(w.photos)));

create table public.wish_devices (
  token text primary key check (length(token) between 10 and 300),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now()
);
alter table public.wish_devices enable row level security;
create policy device_read on public.wish_devices for select to authenticated using (user_id = auth.uid());
create policy device_delete on public.wish_devices for delete to authenticated using (user_id = auth.uid());
grant select, delete on public.wish_devices to authenticated;
create function public.register_wish_device(p_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_token !~ '^(ExponentPushToken|ExpoPushToken)\[.+\]$' then
    raise exception 'Invalid device token';
  end if;
  insert into public.wish_devices(token, user_id) values (p_token, auth.uid())
  on conflict (token) do update set user_id = auth.uid(), updated_at = now();
end; $$;
revoke all on function public.register_wish_device(text) from public;
grant execute on function public.register_wish_device(text) to authenticated;

create table public.wish_jobs (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null,
  recipient_id uuid,
  wish_id uuid,
  message text,
  remove_photos text[] not null default '{}',
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  completed_at timestamptz,
  attempts integer not null default 0,
  last_error text
);
alter table public.wish_jobs enable row level security;
-- Queue is server-only, including message contents and photo paths.
revoke all on public.wish_jobs from anon, authenticated;
create function public.claim_wish_jobs() returns setof public.wish_jobs
language sql security definer set search_path = public as $$
  update public.wish_jobs set claimed_at = now(), attempts = attempts + 1
  where id in (select id from public.wish_jobs where completed_at is null and attempts < 8
    and (claimed_at is null or claimed_at < now() - interval '5 minutes')
    order by created_at limit 30 for update skip locked) returning *;
$$;
revoke all on function public.claim_wish_jobs() from public;
grant execute on function public.claim_wish_jobs() to service_role;

create function public.validate_wish() returns trigger
language plpgsql security definer set search_path = public as $$
declare path text;
begin
  if tg_op = 'INSERT' then new.created_by := auth.uid();
  else
    new.created_by := old.created_by;
    new.couple_id := old.couple_id;
    new.created_at := old.created_at;
    new.version := old.version + 1;
  end if;
  new.updated_at := now();
  if char_length(trim(new.title)) not between 1 and 200 then raise exception 'Название обязательно'; end if;
  foreach path in array new.photos loop
    if path is null or split_part(path, '/', 1) <> new.couple_id::text
      or not exists (select 1 from storage.objects where bucket_id = 'wish-photos' and name = path) then
      raise exception 'Недоступная фотография';
    end if;
  end loop;
  return new;
end; $$;
create trigger validate_wish before insert or update on public.wishes for each row execute function public.validate_wish();

create function public.enqueue_wish_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare w public.wishes; actor text; msg text; removed text[] := '{}';
begin
  if tg_table_name = 'wish_comments' then
    select * into w from public.wishes where id = new.wish_id;
    msg := 'Новый комментарий к желанию';
  elsif tg_op = 'DELETE' then
    w := old; removed := old.photos; msg := 'Желание удалено';
  else
    w := new;
    if tg_op = 'INSERT' then msg := 'Добавлено желание';
    else
      if (old.title, old.description, old.photos, old.list, old.fulfilled) is not distinct from
        (new.title, new.description, new.photos, new.list, new.fulfilled) then return new; end if;
      select coalesce(array_agg(p), '{}') into removed from unnest(old.photos) p where not (p = any(new.photos));
      msg := case when new.fulfilled and not old.fulfilled then 'Желание исполнилось' else 'Желание обновлено' end;
    end if;
  end if;
  select display_name into actor from public.profiles where id = auth.uid();
  if cardinality(removed) > 0 then
    insert into public.wish_jobs(couple_id, remove_photos) values (w.couple_id, removed);
  end if;
  insert into public.wish_jobs(couple_id, recipient_id, wish_id, message)
    select w.couple_id, user_id, w.id, coalesce(actor, 'Партнёр') || ' · ' || msg || ': ' || w.title
    from public.couple_members where couple_id = w.couple_id and user_id <> auth.uid();
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;
create trigger wish_change after insert or update or delete on public.wishes for each row execute function public.enqueue_wish_change();
create trigger wish_comment_added after insert on public.wish_comments for each row execute function public.enqueue_wish_change();
commit;
