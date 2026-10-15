begin;

alter table public.date_events
  add column description text not null default '' check (char_length(description) <= 2000);
grant insert (description) on public.date_events to authenticated;
grant update (description) on public.date_events to authenticated;

alter table public.wishes alter column icon set default 'sparkles';

alter table public.notes
  add column icon text not null default 'note'
  check (icon in ('note', 'checklist', 'idea', 'bookmark', 'book', 'cart', 'flag', 'chat'));
update public.notes set icon = 'checklist' where kind = 'checklist';

-- Keep the previous overload for clients that have not updated yet. It leaves
-- an existing icon unchanged and uses the table default for a new note.
create function public.save_shared_note(
  p_couple_id uuid, p_id uuid, p_version integer, p_kind text,
  p_title text, p_body text, p_items jsonb, p_pinned boolean,
  p_icon text, p_deleted boolean
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
    insert into public.notes(id, couple_id, kind, title, body, items, pinned, icon, updated_by)
    values (coalesce(p_id, gen_random_uuid()), p_couple_id, p_kind, p_title, p_body, p_items, p_pinned, p_icon, auth.uid())
    on conflict (id) do nothing returning * into result;
  else
    update public.notes set title = p_title, body = p_body, items = p_items,
      pinned = p_pinned, icon = p_icon,
      deleted_at = case when p_deleted then coalesce(deleted_at, now()) else null end,
      version = version + 1, updated_by = auth.uid(), updated_at = clock_timestamp()
    where id = p_id and couple_id = p_couple_id and version = p_version and kind = p_kind
    returning * into result;
  end if;
  if result.id is null then
    raise exception 'NOTE_CONFLICT' using errcode = '40001';
  end if;
  return result;
end; $$;
revoke all on function public.save_shared_note(uuid, uuid, integer, text, text, text, jsonb, boolean, text, boolean) from public;
grant execute on function public.save_shared_note(uuid, uuid, integer, text, text, text, jsonb, boolean, text, boolean) to authenticated;

commit;
