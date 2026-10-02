-- Apply manually after 20261001020000_harden_client_permissions.sql.
-- Pending migration: apply manually. Joining preserves both workspaces' content.
begin;
alter table public.couples alter column relationship_started_at drop not null;
alter table public.couples add column merged_into uuid references public.couples(id);

-- Retain the old workspace as a namespace for private photo objects, not as an active workspace.
create table public.personal_join_tickets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  source_id uuid not null references public.couples(id),
  destination_id uuid not null references public.couples(id),
  invite_code text not null,
  categories jsonb not null,
  expires_at timestamptz not null default now()+interval '10 minutes'
);
alter table public.personal_join_tickets enable row level security;
revoke all on public.personal_join_tickets from public,anon,authenticated;

create function public.workspace_category_snapshot(p_source uuid,p_destination uuid) returns jsonb
language sql stable security definer set search_path=public as $$
  select coalesce(jsonb_agg(jsonb_build_object('key',couple_id::text||'/'||value,
    'label',label,'mine',couple_id=p_source) order by couple_id,position,value),'[]'::jsonb)
  from public.date_categories where couple_id in(p_source,p_destination);
$$;

-- Serialize writes against joining, and reject writes started on an archived workspace.
create function public.require_active_workspace() returns trigger
language plpgsql security definer set search_path=public as $$
declare workspace uuid; archived uuid;
begin
  workspace:=case when tg_op='DELETE' then old.couple_id else new.couple_id end;
  select merged_into into archived from public.couples where id=workspace for share;
  if archived is not null then raise exception 'Пространство объединено. Обновите данные.' using errcode='40001'; end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end; $$;
do $$ declare t text; begin
  foreach t in array array['date_events','date_categories','wishes','wish_comments','notes','date_completions'] loop
    execute format('create trigger active_workspace before insert or update or delete on public.%I for each row execute function public.require_active_workspace()',t);
  end loop;
end $$;

create function public.can_read_wish_photo(p_namespace text) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.couples c join public.couple_members m
    on m.couple_id=coalesce(c.merged_into,c.id)
    where c.id::text=p_namespace and m.user_id=auth.uid());
$$;
drop policy wish_photos_read on storage.objects;
create policy wish_photos_read on storage.objects for select to authenticated using (
  bucket_id='wish-photos' and public.can_read_wish_photo((storage.foldername(name))[1]));

create or replace function public.validate_wish() returns trigger
language plpgsql security definer set search_path=public as $$
declare path text;
begin
  if tg_op='INSERT' then new.created_by:=auth.uid();
  else
    new.created_by:=old.created_by;
    if new.couple_id<>old.couple_id and not exists(select 1 from public.couples
      where id=old.couple_id and merged_into=new.couple_id) then
      raise exception 'Недопустимый перенос желания';
    end if;
    new.created_at:=old.created_at;
    new.version:=old.version+1;
  end if;
  new.updated_at:=now();
  if char_length(trim(new.title)) not between 1 and 200 then raise exception 'Название обязательно'; end if;
  foreach path in array new.photos loop
    if path is null or not exists(select 1 from public.couples where id::text=split_part(path,'/',1)
      and coalesce(merged_into,id)=new.couple_id)
      or not exists(select 1 from storage.objects where bucket_id='wish-photos' and name=path) then
      raise exception 'Недоступная фотография';
    end if;
  end loop;
  return new;
end; $$;
-- A transfer is not an edit: do not send a push for every imported wish.
drop trigger wish_change on public.wishes;
create trigger wish_change after insert or delete on public.wishes for each row execute function public.enqueue_wish_change();
create trigger wish_update after update on public.wishes for each row
  when (old.couple_id=new.couple_id) execute function public.enqueue_wish_change();

create or replace function public.manage_date_category(p_couple_id uuid,p_action text,p_value text default null,p_label text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  perform 1 from public.couples where id=p_couple_id for update;
  if auth.uid() is null or not public.is_couple_member(p_couple_id) then raise exception 'Нет доступа к категориям этой пары'; end if;
  if p_action in ('add','rename') and (p_label is null or char_length(trim(p_label)) not between 1 and 40) then
    raise exception 'Введите название от 1 до 40 символов';
  end if;
  if p_action='add' then
    if (select count(*) from public.date_categories where couple_id=p_couple_id)>=6 then
      raise exception 'В пространстве уже 6 категорий';
    end if;
    insert into public.date_categories(couple_id,value,label,position)
      values(p_couple_id,'custom_'||gen_random_uuid()::text,trim(p_label),
        coalesce((select max(position)+1 from public.date_categories where couple_id=p_couple_id),0));
  elsif p_action='rename' then
    update public.date_categories set label=trim(p_label) where couple_id=p_couple_id and value=p_value;
    if not found then raise exception 'Категория уже удалена'; end if;
  elsif p_action='delete' then
    delete from public.date_categories where couple_id=p_couple_id and value=p_value;
    if not found then raise exception 'Категория уже удалена'; end if;
  else raise exception 'Неизвестное действие'; end if;
end; $$;

create function public.ensure_personal_workspace() returns uuid
language plpgsql security definer set search_path=public as $$
declare workspace uuid;
begin
  if auth.uid() is null then raise exception 'Сначала войдите в аккаунт' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,871));
  select couple_id into workspace from public.couple_members where user_id=auth.uid();
  if workspace is not null then return workspace; end if;
  insert into public.couples(created_by,relationship_started_at) values(auth.uid(),null) returning id into workspace;
  insert into public.couple_members(couple_id,user_id) values(workspace,auth.uid());
  return workspace;
end; $$;

create function public.create_personal_invite() returns text
language plpgsql security definer set search_path=public as $$
declare workspace uuid; code text;
begin
  workspace:=public.ensure_personal_workspace();
  perform 1 from public.couples where id=workspace for update;
  if (select count(*) from public.couple_members where couple_id=workspace)<>1 then
    raise exception 'Партнёр уже подключён';
  end if;
  loop
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',get_byte(entropy,i)%31+1,1),'' order by i) into code
      from (select extensions.gen_random_bytes(6) entropy) r cross join generate_series(0,5) i;
    begin
      update public.couples set invite_code=code,invite_expires_at=now()+interval '24 hours' where id=workspace;
      return code;
    exception when unique_violation then null;
    end;
  end loop;
end; $$;

create function public.prepare_personal_join(p_invite_code text)
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
  return jsonb_build_object('token',ticket.token,'categories',ticket.categories);
end; $$;

create function public.join_personal_workspace(p_token uuid,p_categories jsonb,p_confirm_sharing boolean default false)
returns setof public.couples language plpgsql security definer set search_path=public as $$
declare caller uuid:=auth.uid(); ticket public.personal_join_tickets; source_id uuid; destination uuid;
  target public.couples; item jsonb; group_row record; new_value text; old_values text[]; label_map jsonb:='[]';
begin
  if caller is null then raise exception 'Сначала войдите в аккаунт' using errcode='42501'; end if;
  if p_confirm_sharing is distinct from true then raise exception 'Подтвердите объединение данных'; end if;
  perform pg_advisory_xact_lock(hashtextextended(caller::text,871));
  select * into ticket from public.personal_join_tickets where user_id=caller and token=p_token and expires_at>now() for update;
  if not found then raise exception 'Подготовьте объединение заново: подтверждение истекло'; end if;
  source_id:=ticket.source_id; destination:=ticket.destination_id;
  perform 1 from public.couples where id in(source_id,destination) order by id for update;
  if not exists(select 1 from public.couple_members where couple_id=source_id and user_id=caller)
    or (select count(*) from public.couple_members where couple_id=source_id)<>1
    or (select count(*) from public.couple_members where couple_id=destination)<>1
    or not exists(select 1 from public.couples where id=destination and merged_into is null
      and invite_code=ticket.invite_code and invite_expires_at>now()) then
    raise exception 'Пространство или приглашение изменилось. Начните подключение заново.';
  end if;
  if ticket.categories<>public.workspace_category_snapshot(source_id,destination) then
    raise exception 'Категории изменились. Подготовьте объединение заново.';
  end if;
  if p_categories is null or jsonb_typeof(p_categories)<>'array' then raise exception 'Выберите категории'; end if;
  if jsonb_array_length(p_categories)<>jsonb_array_length(ticket.categories)
    or exists(select 1 from jsonb_array_elements(p_categories) x where jsonb_typeof(x->'key') is distinct from 'string'
      or jsonb_typeof(x->'label') is distinct from 'string' or char_length(trim(x->>'label')) not between 1 and 40)
    or (select count(*)<>count(distinct x->>'key') from jsonb_array_elements(p_categories) x)
    or exists(select 1 from jsonb_array_elements(ticket.categories) x where not exists
      (select 1 from jsonb_array_elements(p_categories) y where y->>'key'=x->>'key')) then
    raise exception 'Нужно распределить все категории, не пропуская ни одной';
  end if;
  if (select count(distinct lower(trim(x->>'label'))) from jsonb_array_elements(p_categories) x)>6 then
    raise exception 'Оставьте не больше 6 категорий: объедините некоторые названия';
  end if;
  select array_agg(value) into old_values from public.date_categories where couple_id=destination;
  -- Temporary unique labels avoid collisions while remapping both sets of categories.
  for group_row in select lower(trim(x->>'label')) normalized,min(trim(x->>'label')) label
    from jsonb_array_elements(p_categories) with ordinality a(x,n)
    group by lower(trim(x->>'label')) order by min(n) loop
    new_value:='merged_'||gen_random_uuid()::text;
    insert into public.date_categories(couple_id,value,label,position)
      values(destination,new_value,'_merge_'||replace(gen_random_uuid()::text,'-',''),100);
    label_map:=label_map||jsonb_build_array(jsonb_build_object('key',new_value,'label',group_row.label));
    for item in select x from jsonb_array_elements(p_categories) x where lower(trim(x->>'label'))=group_row.normalized loop
      update public.date_events set couple_id=destination,category=new_value
        where couple_id::text=split_part(item->>'key','/',1) and category=split_part(item->>'key','/',2);
    end loop;
  end loop;
  -- Only category definitions are removed. All their events have already moved above.
  delete from public.date_categories where couple_id=destination and value=any(coalesce(old_values,'{}'));
  update public.date_categories c set label=m.item->>'label',position=m.ordinality::integer-1
    from jsonb_array_elements(label_map) with ordinality m(item,ordinality)
    where c.couple_id=destination and c.value=m.item->>'key';
  update public.couples set merged_into=destination,invite_code=null,invite_expires_at=null where id=source_id;
  update public.couples set merged_into=destination where merged_into=source_id;
  update public.wishes set couple_id=destination,list=case when list='together' then list else 'partner' end where couple_id=source_id;
  update public.wish_comments set couple_id=destination where couple_id=source_id;
  update public.notes set couple_id=destination,version=version+1 where couple_id=source_id;
  update public.date_completions set couple_id=destination where couple_id=source_id;
  update public.couples set relationship_started_at=coalesce(relationship_started_at,
    (select relationship_started_at from public.couples where id=source_id)) where id=destination;
  update public.couple_members set couple_id=destination where user_id=caller and couple_id=source_id;
  update public.couples set invite_code=null,invite_expires_at=null where id=destination returning * into target;
  delete from public.couple_join_attempts where user_id=caller;
  delete from public.personal_join_tickets where user_id=caller;
  return next target;
end; $$;

revoke all on function public.workspace_category_snapshot(uuid,uuid),public.require_active_workspace(),
  public.can_read_wish_photo(text),public.prepare_personal_join(text) from public,anon,authenticated;
grant execute on function public.can_read_wish_photo(text),public.prepare_personal_join(text) to authenticated;
revoke all on function public.ensure_personal_workspace(),public.create_personal_invite(),
  public.join_personal_workspace(uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.ensure_personal_workspace(),public.create_personal_invite(),
  public.join_personal_workspace(uuid,jsonb,boolean) to authenticated;
commit;
