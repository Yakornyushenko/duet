-- Run on a TEST database after migrations, as postgres. Requires one existing pair.
-- Everything is rolled back; the worker cannot see these uncommitted test jobs.
begin;
do $$
declare
  pair_id uuid;
  author uuid;
  partner uuid;
  wish uuid;
  job uuid;
  deadline timestamptz;
  total integer;
begin
  select a.couple_id, a.user_id, b.user_id into pair_id, author, partner
    from public.couple_members a join public.couple_members b
      on a.couple_id = b.couple_id and a.user_id <> b.user_id limit 1;
  if pair_id is null then raise exception 'Test requires an existing pair'; end if;
  perform set_config('request.jwt.claim.sub', author::text, true);

  insert into public.wishes(couple_id, list, title) values (pair_id, 'together', 'Test initial')
    returning id into wish;
  select id into job from public.wish_jobs where wish_id = wish;
  -- Move the deadline backwards to check that a later edit resets it.
  update public.wish_jobs set ready_at = now() - interval '1 second' where id = job;
  update public.wishes set description = 'First edit' where id = wish;
  update public.wishes set description = 'Second edit' where id = wish;
  update public.wishes set title = 'Test final' where id = wish;
  select count(*) into total from public.wish_jobs where wish_id = wish and completed_at is null;
  if total <> 1 then raise exception 'Expected one grouped notification, got %', total; end if;
  if not exists (select 1 from public.wish_jobs where id = job and event_kind = 'created'
      and recipient_id = partner and actor_id = author
      and message like '%Добавлено желание: Test final'
      and ready_at > clock_timestamp() + interval '55 seconds') then
    raise exception 'Wrong grouped message, recipient or deadline';
  end if;
  select ready_at into deadline from public.wish_jobs where id = job;
  update public.wishes set title = title where id = wish;
  if (select ready_at from public.wish_jobs where id = job) <> deadline then
    raise exception 'No-op save postponed notification';
  end if;

  insert into public.wish_comments(couple_id, wish_id, author_id, body)
    values (pair_id, wish, author, 'Separate comment');
  if not exists (select 1 from public.wish_jobs where wish_id = wish
    and event_kind = 'comment' and ready_at <= now()) then
    raise exception 'Comment should be separate and immediately eligible';
  end if;
  delete from public.wishes where id = wish;
  if exists (select 1 from public.wish_jobs where wish_id = wish
    and event_kind in ('created', 'updated', 'deleted') and completed_at is null) then
    raise exception 'Create then delete must cancel pending wish notification';
  end if;

  insert into public.wishes(couple_id, list, title) values (pair_id, 'together', 'Already sending')
    returning id into wish;
  select id into job from public.wish_jobs where wish_id = wish;
  update public.wish_jobs set claimed_at = now(), attempts = 1 where id = job;
  update public.wishes set title = 'Edit after claim' where id = wish;
  if not exists (select 1 from public.wish_jobs where wish_id = wish
    and event_kind = 'updated' and id <> job and message like '%Edit after claim') then
    raise exception 'Claimed job must remain immutable; edit needs a new job';
  end if;
  if not exists (select 1 from public.wish_jobs where id = job and message like '%Already sending') then
    raise exception 'Claimed job was overwritten';
  end if;

  perform set_config('request.jwt.claim.sub', partner::text, true);
  update public.wishes set title = 'Partner edit' where id = wish;
  if not exists (select 1 from public.wish_jobs where wish_id = wish
    and actor_id = partner and recipient_id = author and event_kind = 'updated') then
    raise exception 'Different authors must have separate notifications';
  end if;
  raise notice 'Debounce tests passed';
end $$;
rollback;
