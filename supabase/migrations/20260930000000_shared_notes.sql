begin;

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  kind text not null check (kind in ('text', 'checklist')),
  title text not null default '' check (char_length(title) <= 120),
  body text not null default '' check (char_length(body) <= 20000),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 100),
  pinned boolean not null default false,
  deleted_at timestamptz,
  version integer not null default 1,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index notes_couple_idx on public.notes(couple_id, updated_at desc);
alter table public.notes enable row level security;
create policy notes_read on public.notes for select to authenticated
  using (public.is_couple_member(couple_id));
revoke all on public.notes from anon, authenticated;
grant select on public.notes to authenticated;

-- Every mutation checks the version atomically; stale editors cannot overwrite a partner.
create function public.save_shared_note(
  p_couple_id uuid, p_id uuid, p_version integer, p_kind text,
  p_title text, p_body text, p_items jsonb, p_pinned boolean, p_deleted boolean
) returns public.notes
language plpgsql security definer set search_path = public as $$
declare result public.notes;
begin
  if auth.uid() is null or not public.is_couple_member(p_couple_id) then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Invalid checklist';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) item
    where jsonb_typeof(item) <> 'object'
      or jsonb_typeof(item->'id') is distinct from 'string'
      or jsonb_typeof(item->'text') is distinct from 'string'
      or jsonb_typeof(item->'done') is distinct from 'boolean'
      or length(item->>'id') not between 1 and 100
      or length(item->>'text') > 500)
    or (select count(*) <> count(distinct item->>'id') from jsonb_array_elements(p_items) item) then
    raise exception 'Invalid checklist';
  end if;
  if p_version = 0 then
    insert into public.notes(id, couple_id, kind, title, body, items, pinned, updated_by)
    values (coalesce(p_id, gen_random_uuid()), p_couple_id, p_kind, p_title, p_body, p_items, p_pinned, auth.uid())
    on conflict (id) do nothing returning * into result;
  else
    update public.notes set title = p_title, body = p_body, items = p_items,
      pinned = p_pinned, deleted_at = case when p_deleted then coalesce(deleted_at, now()) else null end,
      version = version + 1, updated_by = auth.uid(), updated_at = clock_timestamp()
    where id = p_id and couple_id = p_couple_id and version = p_version and kind = p_kind
    returning * into result;
  end if;
  if result.id is null then
    raise exception 'NOTE_CONFLICT' using errcode = '40001';
  end if;
  return result;
end; $$;
revoke all on function public.save_shared_note(uuid, uuid, integer, text, text, text, jsonb, boolean, boolean) from public;
grant execute on function public.save_shared_note(uuid, uuid, integer, text, text, text, jsonb, boolean, boolean) to authenticated;
alter publication supabase_realtime add table public.notes;
commit;
