begin;

-- Remove Supabase's direct default grants as well as grants to PUBLIC.
do $$
declare target text; columns text; fn record;
begin
  foreach target in array array['profiles','couples','couple_members','date_events',
    'date_categories','wishes','wish_comments','wish_devices','wish_jobs','notes','date_completions'] loop
    execute format('revoke all privileges on table public.%I from public, anon, authenticated', target);
    select string_agg(quote_ident(attname), ',') into columns from pg_attribute
      where attrelid = format('public.%I', target)::regclass and attnum > 0 and not attisdropped;
    execute format('revoke all privileges (%s) on table public.%I from public, anon, authenticated', columns, target);
  end loop;
  for fn in select p.oid::regprocedure as signature from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' loop
    execute format('revoke all privileges on function %s from public, anon, authenticated', fn.signature);
  end loop;
end;
$$;

grant select on public.profiles, public.couples, public.couple_members,
  public.date_events, public.date_categories, public.wishes, public.wish_comments,
  public.wish_devices, public.notes, public.date_completions to authenticated;
grant update(display_name) on public.profiles to authenticated;
grant insert(couple_id,title,event_date,recurrence,icon,category) on public.date_events to authenticated;
grant update(title,event_date,recurrence,icon,category) on public.date_events to authenticated;
grant delete on public.date_events to authenticated;
grant insert(couple_id,list,title,description,photos,icon,fulfilled) on public.wishes to authenticated;
grant update(title,description,photos,list,icon,fulfilled) on public.wishes to authenticated;
grant delete on public.wishes to authenticated;
grant insert(couple_id,wish_id,body) on public.wish_comments to authenticated;
grant delete on public.wish_comments, public.wish_devices to authenticated;

grant execute on function public.create_couple(date), public.join_couple(text),
  public.update_relationship_started_at(date), public.is_couple_member(uuid,uuid),
  public.shares_couple_with(uuid), public.register_wish_device(text),
  public.manage_date_category(uuid,text,text,text),
  public.save_shared_note(uuid,uuid,integer,text,text,text,jsonb,boolean,boolean),
  public.empty_notes_trash(uuid,jsonb), public.set_date_completion(uuid,date,boolean)
  to authenticated;
grant execute on function public.claim_wish_jobs() to service_role;

-- A caller cannot use the helper to probe a different user's membership.
create or replace function public.is_couple_member(p_couple_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and p_user_id = auth.uid() and exists (
    select 1 from public.couple_members where couple_id=p_couple_id and user_id=auth.uid()
  );
$$;

-- For future objects created by our migration owner, require explicit grants.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;
alter default privileges for role postgres revoke execute on functions from public;

create table public.couple_join_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  attempts integer not null check(attempts between 1 and 5)
);
alter table public.couple_join_attempts enable row level security;
revoke all on public.couple_join_attempts from public, anon, authenticated;

create or replace function public.join_couple(p_invite_code text)
returns setof public.couples language plpgsql security definer set search_path = public as $$
declare
  caller uuid := auth.uid();
  normalized_code text := upper(trim(p_invite_code));
  target_couple public.couples;
  accepted integer;
begin
  if caller is null then raise exception 'Сначала войдите в аккаунт' using errcode='42501'; end if;
  -- Serialize requests for the same account, including concurrent devices.
  perform pg_advisory_xact_lock(hashtextextended(caller::text, 871));
  if exists(select 1 from public.couple_members where user_id=caller) then
    raise exception 'Вы уже состоите в паре';
  end if;
  insert into public.couple_join_attempts as a(user_id,window_started_at,attempts)
    values(caller,clock_timestamp(),1)
  on conflict(user_id) do update set
    window_started_at=case when a.window_started_at <= clock_timestamp()-interval '15 minutes'
      then clock_timestamp() else a.window_started_at end,
    attempts=case when a.window_started_at <= clock_timestamp()-interval '15 minutes'
      then 1 else a.attempts+1 end
  where a.attempts < 5 or a.window_started_at <= clock_timestamp()-interval '15 minutes'
  returning attempts into accepted;
  -- Failed attempts must COMMIT: raising an exception would undo the counter.
  -- Keep the existing SETOF couples API; an empty result means rejected.
  if accepted is null or normalized_code is null or normalized_code !~ '^[A-Z2-9]{6}$' then return; end if;
  select * into target_couple from public.couples
    where invite_code=normalized_code and invite_expires_at>now() for update;
  if not found then return; end if;
  if (select count(*) from public.couple_members where couple_id=target_couple.id)>=2 then return; end if;
  begin
    insert into public.couple_members(couple_id,user_id) values(target_couple.id,caller);
  exception when unique_violation then return;
  end;
  update public.couples set invite_code=null,invite_expires_at=null
    where id=target_couple.id returning * into target_couple;
  delete from public.couple_join_attempts where user_id=caller;
  return next target_couple;
end;
$$;
revoke all on function public.join_couple(text) from public, anon;
grant execute on function public.join_couple(text) to authenticated;
commit;
