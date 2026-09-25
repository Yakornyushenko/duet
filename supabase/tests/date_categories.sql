-- TEST database only, run after migrations as postgres. All changes roll back.
begin;
do $$
declare
  pair_id uuid;
  actor uuid;
  category_key text;
  event_id uuid;
  rejected boolean := false;
begin
  select couple_id, user_id into pair_id, actor from public.couple_members limit 1;
  if pair_id is null then raise exception 'Test requires a pair'; end if;
  perform set_config('request.jwt.claim.sub', actor::text, true);
  delete from public.date_categories where couple_id = pair_id and custom_slot is not null;
  perform public.manage_date_category(pair_id, 'add', null, 'Test custom one');
  perform public.manage_date_category(pair_id, 'add', null, 'Test custom two');
  begin
    perform public.manage_date_category(pair_id, 'add', null, 'Test overflow');
  exception when raise_exception then rejected := true;
  end;
  if not rejected then raise exception 'Third custom category was allowed'; end if;
  select value into category_key from public.date_categories where couple_id = pair_id and custom_slot = 1;
  perform public.manage_date_category(pair_id, 'rename', category_key, 'Test renamed');
  if not exists (select 1 from public.date_categories where couple_id = pair_id and value = category_key and label = 'Test renamed') then
    raise exception 'Rename failed';
  end if;
  insert into public.date_events(couple_id, title, event_date, category, created_by)
    values (pair_id, 'Test category event', current_date, category_key, actor) returning id into event_id;
  perform public.manage_date_category(pair_id, 'delete', category_key);
  if exists (select 1 from public.date_events where id = event_id) then raise exception 'Cascade delete failed'; end if;
  perform public.manage_date_category(pair_id, 'add', null, 'Test reused slot');
  if (select count(*) from public.date_categories where couple_id = pair_id and custom_slot is not null) <> 2 then
    raise exception 'Slot reuse failed';
  end if;
  select value into category_key from public.date_categories where couple_id = pair_id and custom_slot is null limit 1;
  if category_key is not null then
    perform public.manage_date_category(pair_id, 'rename', category_key, 'Test standard renamed');
    perform public.manage_date_category(pair_id, 'delete', category_key);
    if exists (select 1 from public.date_categories where couple_id = pair_id and value = category_key) then
      raise exception 'Standard category not deleted';
    end if;
  end if;
  perform set_config('request.jwt.claim.sub', '', true);
  rejected := false;
  begin
    perform public.manage_date_category(pair_id, 'add', null, 'Unauthorized');
  exception when raise_exception then rejected := true;
  end;
  if not rejected then raise exception 'Anonymous management allowed'; end if;
  raise notice 'Category checks passed';
end $$;
rollback;
