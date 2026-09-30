-- Run on a TEST database after the notes migration; all changes roll back.
begin;
do $$
declare
  pair_id uuid;
  actor uuid;
  result public.notes;
  rejected boolean := false;
begin
  select couple_id, user_id into pair_id, actor from public.couple_members limit 1;
  if pair_id is null then raise exception 'Requires a test pair'; end if;
  perform set_config('request.jwt.claim.sub', actor::text, true);
  result := public.save_shared_note(pair_id, null, 0, 'text', 'Test', 'Original', '[]', false, false);
  if result.version <> 1 or result.updated_by <> actor then raise exception 'Creation failed'; end if;
  result := public.save_shared_note(pair_id, result.id, 1, 'text', 'Test', 'New', '[]', true, false);
  if result.version <> 2 or not result.pinned then raise exception 'Update failed'; end if;
  begin
    perform public.save_shared_note(pair_id, result.id, 1, 'text', 'Stale', 'Overwrite', '[]', false, false);
  exception when serialization_failure then rejected := true;
  end;
  if not rejected then raise exception 'Stale version accepted'; end if;
  if (select body from public.notes where id = result.id) <> 'New' then raise exception 'Conflict overwrote content'; end if;
  result := public.save_shared_note(pair_id, result.id, 2, 'text', 'Test', 'New', '[]', true, true);
  if result.deleted_at is null then raise exception 'Trash failed'; end if;
  result := public.save_shared_note(pair_id, result.id, 3, 'text', 'Test', 'New', '[]', true, false);
  if result.deleted_at is not null then raise exception 'Restore failed'; end if;
  rejected := false;
  begin
    perform public.save_shared_note(pair_id, null, 0, 'checklist', '', '', '[{"id":"1","text":"x","done":"wrong"}]', false, false);
  exception when raise_exception then rejected := true;
  end;
  if not rejected then raise exception 'Invalid checklist allowed'; end if;
  perform set_config('request.jwt.claim.sub', '', true);
  rejected := false;
  begin
    perform public.save_shared_note(pair_id, result.id, 4, 'text', 'Unauthorized', '', '[]', false, false);
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'Anonymous write allowed'; end if;
  raise notice 'Notes database checks passed';
end $$;
rollback;
