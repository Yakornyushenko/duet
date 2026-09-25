begin;
alter type public.date_event_icon add value if not exists 'sun';
alter type public.date_event_icon add value if not exists 'moon';
alter type public.date_event_icon add value if not exists 'cafe';
alter type public.date_event_icon add value if not exists 'restaurant';
alter type public.date_event_icon add value if not exists 'film';
alter type public.date_event_icon add value if not exists 'music';
alter type public.date_event_icon add value if not exists 'camera';
alter type public.date_event_icon add value if not exists 'flower';
alter type public.date_event_icon add value if not exists 'home';
alter type public.date_event_icon add value if not exists 'fitness';

alter table public.wishes add column icon public.date_event_icon not null default 'heart';
grant update (icon) on public.wishes to authenticated;

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
      if (old.title, old.description, old.photos, old.list, old.fulfilled, old.icon) is not distinct from
        (new.title, new.description, new.photos, new.list, new.fulfilled, new.icon) then
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


commit;
