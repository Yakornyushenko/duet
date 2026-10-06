-- Empty personal workspaces contain no user data to review before joining.
begin;

create function public.workspace_is_empty(p_workspace uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select
    c.relationship_started_at is null
    and not exists(select 1 from public.date_events where couple_id=p_workspace)
    and not exists(select 1 from public.wishes where couple_id=p_workspace)
    and not exists(select 1 from public.notes where couple_id=p_workspace)
    and coalesce((
      select jsonb_object_agg(value,label)
      from public.date_categories
      where couple_id=p_workspace
    ),'{}'::jsonb)=jsonb_build_object(
      'important','Важные даты',
      'travel','Путешествия',
      'dates','Свидания',
      'other','Разное'
    )
  from public.couples c
  where c.id=p_workspace and c.merged_into is null;
$$;

revoke all on function public.workspace_is_empty(uuid) from public,anon,authenticated;

create or replace function public.prepare_personal_join(p_invite_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare caller uuid:=auth.uid(); source_id uuid; destination uuid; accepted integer; ticket public.personal_join_tickets;
begin
  if caller is null then raise exception 'Сначала войдите в аккаунт' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(caller::text,871));
  insert into public.couple_join_attempts as a(user_id,window_started_at,attempts) values(caller,clock_timestamp(),1)
    on conflict(user_id) do update set
      window_started_at=case when a.window_started_at<=clock_timestamp()-interval '15 minutes' then clock_timestamp() else a.window_started_at end,
      attempts=case when a.window_started_at<=clock_timestamp()-interval '15 minutes' then 1 else a.attempts+1 end
    where a.attempts<5 or a.window_started_at<=clock_timestamp()-interval '15 minutes' returning attempts into accepted;
  -- Do not raise for rejected codes: that would roll back the attempt counter.
  if accepted is null then return null; end if;
  select id into destination from public.couples where invite_code=upper(trim(p_invite_code)) and invite_expires_at>now();
  if destination is null then return null; end if;
  select couple_id into source_id from public.couple_members where user_id=caller;
  if source_id is null or source_id=destination then return null; end if;
  perform 1 from public.couples where id in(source_id,destination) order by id for update;
  if not exists(select 1 from public.couples where id=destination and merged_into is null
      and invite_code=upper(trim(p_invite_code)) and invite_expires_at>now())
    or (select count(*) from public.couple_members where couple_id=destination)<>1
    or (select count(*) from public.couple_members where couple_id=source_id)<>1
    or not exists(select 1 from public.couple_members where couple_id=source_id and user_id=caller) then return null; end if;
  insert into public.personal_join_tickets(user_id,source_id,destination_id,invite_code,categories)
    values(caller,source_id,destination,upper(trim(p_invite_code)),public.workspace_category_snapshot(source_id,destination))
    on conflict(user_id) do update set token=gen_random_uuid(),source_id=excluded.source_id,
      destination_id=excluded.destination_id,invite_code=excluded.invite_code,categories=excluded.categories,
      expires_at=now()+interval '10 minutes' returning * into ticket;
  return jsonb_build_object(
    'token',ticket.token,
    'categories',ticket.categories,
    'sourceEmpty',public.workspace_is_empty(source_id)
  );
end; $$;

create function public.join_empty_personal_workspace(p_token uuid)
returns setof public.couples language plpgsql security definer set search_path=public as $$
declare caller uuid:=auth.uid(); ticket public.personal_join_tickets; source_id uuid; destination uuid; target public.couples;
begin
  if caller is null then raise exception 'Сначала войдите в аккаунт' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(caller::text,871));
  select * into ticket from public.personal_join_tickets
    where user_id=caller and token=p_token and expires_at>now() for update;
  if not found then raise exception 'Подготовьте подключение заново: приглашение истекло'; end if;
  source_id:=ticket.source_id;
  destination:=ticket.destination_id;
  perform 1 from public.couples where id in(source_id,destination) order by id for update;
  if not exists(select 1 from public.couple_members where couple_id=source_id and user_id=caller)
    or (select count(*) from public.couple_members where couple_id=source_id)<>1
    or (select count(*) from public.couple_members where couple_id=destination)<>1
    or not exists(select 1 from public.couples where id=destination and merged_into is null
      and invite_code=ticket.invite_code and invite_expires_at>now()) then
    raise exception 'Пространство или приглашение изменилось. Начните подключение заново.';
  end if;
  if not public.workspace_is_empty(source_id) then
    raise exception 'В личном пространстве появились данные. Проверьте их перед объединением.';
  end if;
  update public.couples set merged_into=destination,invite_code=null,invite_expires_at=null where id=source_id;
  update public.couples set merged_into=destination where merged_into=source_id;
  update public.couple_members set couple_id=destination where user_id=caller and couple_id=source_id;
  update public.couples set invite_code=null,invite_expires_at=null where id=destination returning * into target;
  delete from public.couple_join_attempts where user_id=caller;
  delete from public.personal_join_tickets where user_id=caller;
  return next target;
end; $$;

revoke all on function public.join_empty_personal_workspace(uuid) from public,anon,authenticated;
grant execute on function public.join_empty_personal_workspace(uuid) to authenticated;

commit;
