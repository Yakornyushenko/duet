begin;

-- Existing jobs are deliberately left ungrouped: their author/type is unknown.
alter table public.wish_jobs
  add column actor_id uuid,
  add column event_kind text not null default 'legacy'
    check (event_kind in ('legacy', 'created', 'updated', 'deleted', 'comment', 'cleanup')),
  add column ready_at timestamptz not null default now();

create index wish_jobs_pending_group_idx
  on public.wish_jobs(wish_id, actor_id, recipient_id)
  where completed_at is null and claimed_at is null and attempts = 0;

create or replace function public.claim_wish_jobs() returns setof public.wish_jobs
language sql security definer set search_path = public as $$
  update public.wish_jobs set claimed_at = now(), attempts = attempts + 1
  where id in (
    select id from public.wish_jobs
    where completed_at is null and attempts < 8 and ready_at <= now()
      and (claimed_at is null or claimed_at < now() - interval '5 minutes')
    order by ready_at, created_at limit 30 for update skip locked
  ) returning *;
$$;

create or replace function public.enqueue_wish_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  w public.wishes;
  actor text;
  author_id uuid := auth.uid();
  recipient uuid;
  kind text;
  msg text;
  removed text[] := '{}';
  pending public.wish_jobs;
begin
  if tg_table_name = 'wish_comments' then
    select * into w from public.wishes where id = new.wish_id;
    kind := 'comment'; msg := 'Новый комментарий к желанию';
  elsif tg_op = 'DELETE' then
    w := old; removed := old.photos;
    kind := 'deleted'; msg := 'Желание удалено';
  else
    w := new;
    if tg_op = 'INSERT' then
      kind := 'created'; msg := 'Добавлено желание';
    else
      if (old.title, old.description, old.photos, old.list, old.fulfilled) is not distinct from
        (new.title, new.description, new.photos, new.list, new.fulfilled) then
        return new;
      end if;
      select coalesce(array_agg(p), '{}') into removed
        from unnest(old.photos) p where not (p = any(new.photos));
      kind := 'updated';
      msg := case when new.fulfilled then 'Желание исполнилось' else 'Желание обновлено' end;
    end if;
  end if;

  select display_name into actor from public.profiles where id = author_id;
  -- Photo cleanup must not be lost when a notification is merged or cancelled.
  if cardinality(removed) > 0 then
    insert into public.wish_jobs(couple_id, remove_photos, event_kind)
      values (w.couple_id, removed, 'cleanup');
  end if;

  for recipient in select user_id from public.couple_members
    where couple_id = w.couple_id and user_id <> author_id
  loop
    if kind = 'comment' then
      insert into public.wish_jobs(couple_id, recipient_id, wish_id, actor_id, event_kind, message)
        values (w.couple_id, recipient, w.id, author_id, kind,
          coalesce(actor, 'Партнёр') || ' · ' || msg || ': ' || w.title);
      continue;
    end if;

    -- Wish updates already hold the wish row lock. Lock the job too so claiming
    -- and merging cannot race. Once attempted, a job may already be delivered:
    -- never rewrite it, including after a timeout or failed attempt.
    select * into pending from public.wish_jobs
      where wish_id = w.id and actor_id = author_id and recipient_id = recipient
        and event_kind in ('created', 'updated')
        and completed_at is null and claimed_at is null and attempts = 0
      order by created_at desc limit 1 for update;

    if found then
      if kind = 'deleted' and pending.event_kind = 'created' then
        update public.wish_jobs set completed_at = clock_timestamp(),
          last_error = 'Cancelled: deleted before sending' where id = pending.id;
      else
        update public.wish_jobs set
          event_kind = case when pending.event_kind = 'created' then 'created' else kind end,
          message = coalesce(actor, 'Партнёр') || ' · ' ||
            case when pending.event_kind = 'created' then 'Добавлено желание' else msg end || ': ' || w.title,
          ready_at = clock_timestamp() + interval '60 seconds'
          where id = pending.id;
      end if;
    else
      insert into public.wish_jobs(couple_id, recipient_id, wish_id, actor_id, event_kind, message, ready_at)
        values (w.couple_id, recipient, w.id, author_id, kind,
          coalesce(actor, 'Партнёр') || ' · ' || msg || ': ' || w.title,
          clock_timestamp() + interval '60 seconds');
    end if;
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.enqueue_wish_change() from public;
revoke all on function public.claim_wish_jobs() from public;
grant execute on function public.claim_wish_jobs() to service_role;
commit;
