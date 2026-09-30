begin;
create function public.empty_notes_trash(p_couple_id uuid, p_notes jsonb)
returns setof uuid language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_couple_member(p_couple_id) then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  -- Only the confirmed versions are removed. Restored or edited notes are spared.
  return query
    delete from public.notes n
    using jsonb_to_recordset(p_notes) as target(id uuid, version integer)
    where n.couple_id = p_couple_id and n.id = target.id
      and n.version = target.version and n.deleted_at is not null
    returning n.id;
end; $$;
revoke all on function public.empty_notes_trash(uuid, jsonb) from public;
grant execute on function public.empty_notes_trash(uuid, jsonb) to authenticated;
commit;
