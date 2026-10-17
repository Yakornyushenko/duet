begin;

alter table public.wish_jobs
  add column date_event_id uuid;

alter table public.wish_jobs
  drop constraint if exists wish_jobs_event_kind_check;

alter table public.wish_jobs
  add constraint wish_jobs_event_kind_check
  check (event_kind in ('legacy', 'created', 'updated', 'deleted', 'comment', 'cleanup', 'date_created'));

create or replace function public.enqueue_date_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  recipient uuid;
begin
  if new.created_by is null then
    return new;
  end if;

  select display_name into actor_name
  from public.profiles
  where id = new.created_by;

  for recipient in
    select user_id
    from public.couple_members
    where couple_id = new.couple_id
      and user_id <> new.created_by
  loop
    insert into public.wish_jobs(
      couple_id,
      recipient_id,
      date_event_id,
      actor_id,
      event_kind,
      message,
      ready_at
    ) values (
      new.couple_id,
      recipient,
      new.id,
      new.created_by,
      'date_created',
      coalesce(actor_name, 'Партнёр') || ' · Добавлена дата: ' || new.title,
      clock_timestamp()
    );
  end loop;

  return new;
end;
$$;

revoke all on function public.enqueue_date_created() from public, anon, authenticated;

create trigger date_events_enqueue_created_notification
after insert on public.date_events
for each row execute function public.enqueue_date_created();

commit;
