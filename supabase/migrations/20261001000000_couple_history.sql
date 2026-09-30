begin;

-- Existing fulfilled wishes deliberately keep NULL: their completion date is unknown.
alter table public.wishes add column fulfilled_at timestamptz;
create function public.stamp_wish_fulfillment() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.fulfilled_at := case when new.fulfilled then clock_timestamp() else null end;
  elsif new.fulfilled and not old.fulfilled then
    new.fulfilled_at := clock_timestamp();
  elsif not new.fulfilled then
    new.fulfilled_at := null;
  else
    new.fulfilled_at := old.fulfilled_at;
  end if;
  return new;
end; $$;
create trigger stamp_wish_fulfillment before insert or update on public.wishes
  for each row execute function public.stamp_wish_fulfillment();

create table public.date_completions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.date_events(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  happened_on date not null,
  recorded_at timestamptz not null default now(),
  recorded_by uuid references public.profiles(id) on delete set null,
  unique(event_id, happened_on)
);
create index date_completions_couple_idx on public.date_completions(couple_id, happened_on desc);
alter table public.date_completions enable row level security;
create policy date_completions_read on public.date_completions for select to authenticated
  using (public.is_couple_member(couple_id));
revoke all on public.date_completions from anon, authenticated;
grant select on public.date_completions to authenticated;

create function public.set_date_completion(p_event_id uuid, p_date date, p_complete boolean)
returns void language plpgsql security definer set search_path = public as $$
declare event public.date_events;
begin
  select * into event from public.date_events where id = p_event_id for update;
  if event.id is null or auth.uid() is null or not public.is_couple_member(event.couple_id) then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  -- Allow every device's current local day, including UTC+14. UI enforces local today.
  if p_date is null or p_date > (now() at time zone 'UTC')::date + 1 then
    raise exception 'Invalid completion date';
  end if;
  if p_complete then
    if event.recurrence = 'none' and exists (select 1 from public.date_completions where event_id = event.id and happened_on <> p_date) then
      raise exception 'This event is already completed';
    end if;
    insert into public.date_completions(event_id, couple_id, happened_on, recorded_by)
      values(event.id, event.couple_id, p_date, auth.uid())
      on conflict(event_id, happened_on) do nothing;
  else
    delete from public.date_completions where event_id = event.id and happened_on = p_date;
  end if;
end; $$;
revoke all on function public.set_date_completion(uuid, date, boolean) from public;
grant execute on function public.set_date_completion(uuid, date, boolean) to authenticated;
alter publication supabase_realtime add table public.date_completions;
commit;
