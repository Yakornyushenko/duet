begin;

-- Keeps photo paths across retries. The row disappears with auth.users only
-- after Storage cleanup and Auth deletion have both succeeded.
create table public.account_deletion_jobs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  photo_paths text[] not null default '{}',
  requested_at timestamptz not null default now()
);
alter table public.account_deletion_jobs enable row level security;
revoke all on public.account_deletion_jobs from public, anon, authenticated;

-- Existing sessions may keep using their current workspace while Storage is
-- being cleaned. Once database cleanup removes membership, realtime refreshes
-- must not recreate a personal workspace before Auth deletion completes.
create or replace function public.ensure_personal_workspace()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace uuid;
begin
  if auth.uid() is null then
    raise exception 'Сначала войдите в аккаунт' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 871));
  select couple_id into workspace from public.couple_members where user_id = auth.uid();
  if workspace is not null then return workspace; end if;

  if exists(select 1 from public.account_deletion_jobs where user_id = auth.uid()) then
    raise exception 'Аккаунт удаляется' using errcode = '55000';
  end if;

  insert into public.couples(created_by, relationship_started_at)
  values(auth.uid(), null)
  returning id into workspace;
  insert into public.couple_members(couple_id, user_id) values(workspace, auth.uid());
  return workspace;
end;
$$;

-- Phase one snapshots every private Storage object owned by the user. It does
-- not touch application data, so a failed Storage request is safe to retry.
create function public.begin_account_deletion(p_user_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  paths text[] := '{}';
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Недостаточно прав' using errcode = '42501';
  end if;
  if p_user_id is null or not exists(select 1 from auth.users where id = p_user_id) then
    raise exception 'Аккаунт не найден' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 2048));

  select photo_paths into paths
  from public.account_deletion_jobs
  where user_id = p_user_id;

  if not found then
    select coalesce(array_agg(name order by name), '{}') into paths
    from storage.objects
    where bucket_id = 'wish-photos'
      and split_part(name, '/', 2) = p_user_id::text;

    insert into public.account_deletion_jobs(user_id, photo_paths)
    values(p_user_id, paths);
  end if;

  return paths;
end;
$$;

-- Phase two removes all application records that identify the user. It runs
-- only after Storage cleanup, and its changes commit atomically.
create function public.finalize_account_deletion(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  user_photo_paths text[] := '{}';
  solo_workspaces uuid[] := '{}';
  deleted_wishes uuid[] := '{}';
  scrubbed_wishes uuid[] := '{}';
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Недостаточно прав' using errcode = '42501';
  end if;
  if p_user_id is null or not exists(select 1 from auth.users where id = p_user_id) then
    raise exception 'Аккаунт не найден' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 2048));
  select photo_paths into user_photo_paths
  from public.account_deletion_jobs
  where user_id = p_user_id;
  if not found then
    raise exception 'Удаление аккаунта не подготовлено' using errcode = '55000';
  end if;

  select coalesce(array_agg(id), '{}') into solo_workspaces
  from public.couples c
  where (
      c.created_by = p_user_id
      or exists(select 1 from public.couple_members mine where mine.couple_id = c.id and mine.user_id = p_user_id)
    )
    and not exists(
      select 1 from public.couple_members other
      where other.couple_id = c.id and other.user_id <> p_user_id
    );

  select coalesce(array_agg(id), '{}') into deleted_wishes
  from public.wishes
  where created_by = p_user_id or couple_id = any(solo_workspaces);

  -- A partner's wish can contain a photo uploaded by the departing user. Keep
  -- the shared wish, but remove the stale photo path after Storage cleanup.
  select coalesce(array_agg(id), '{}') into scrubbed_wishes
  from public.wishes
  where photos && user_photo_paths
    and created_by is distinct from p_user_id
    and not (couple_id = any(solo_workspaces));

  update public.wishes w
  set photos = (
    select coalesce(array_agg(path), '{}'::text[])
    from unnest(w.photos) path
    where not (path = any(user_photo_paths))
  )
  where w.id = any(scrubbed_wishes);

  -- Preserve a shared workspace for the partner, but remove attribution and
  -- content that can be tied unambiguously to the departing account.
  update public.couples c
  set created_by = (
    select member.user_id
    from public.couple_members member
    where member.couple_id = c.id and member.user_id <> p_user_id
    order by member.joined_at
    limit 1
  )
  where c.created_by = p_user_id
    and not (c.id = any(solo_workspaces))
    and exists(
      select 1 from public.couple_members member
      where member.couple_id = c.id and member.user_id <> p_user_id
    );

  delete from public.daily_question_answers where user_id = p_user_id;
  delete from public.question_preferences where user_id = p_user_id;
  delete from public.wish_comments where author_id = p_user_id;
  delete from public.date_events where created_by = p_user_id;
  delete from public.wishes where created_by = p_user_id;
  delete from public.wish_devices where user_id = p_user_id;
  delete from public.couple_join_attempts where user_id = p_user_id;
  delete from public.personal_join_tickets
  where user_id = p_user_id
    or source_id = any(solo_workspaces)
    or destination_id = any(solo_workspaces);

  update public.couples
  set merged_into = null
  where merged_into = any(solo_workspaces)
    and not (id = any(solo_workspaces));

  -- Daily-question jobs reference couple_daily_questions without ON DELETE.
  delete from public.wish_jobs
  where recipient_id = p_user_id
    or actor_id = p_user_id
    or couple_id = any(solo_workspaces)
    or wish_id = any(deleted_wishes)
    or wish_id = any(scrubbed_wishes)
    or remove_photos && user_photo_paths;

  delete from public.couple_daily_questions where couple_id = any(solo_workspaces);
  delete from public.couple_members where user_id = p_user_id;
  delete from public.couples where id = any(solo_workspaces);

  -- Cascaded wish deletion can run its notification trigger. Remove anything
  -- it queued so deletion never notifies the remaining partner.
  delete from public.wish_jobs
  where recipient_id = p_user_id
    or actor_id = p_user_id
    or couple_id = any(solo_workspaces)
    or wish_id = any(deleted_wishes)
    or wish_id = any(scrubbed_wishes)
    or remove_photos && user_photo_paths;

end;
$$;

revoke all on function public.begin_account_deletion(uuid) from public, anon, authenticated;
revoke all on function public.finalize_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.begin_account_deletion(uuid) to service_role;
grant execute on function public.finalize_account_deletion(uuid) to service_role;

commit;
