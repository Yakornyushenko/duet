-- Run inside an outer transaction; all synthetic fixtures are rolled back.
create temporary table security_test_ids as select gen_random_uuid() as owner_id,
  gen_random_uuid() as partner_id, gen_random_uuid() as outsider_id,
  gen_random_uuid() as couple_id, gen_random_uuid() as event_id;
grant select on security_test_ids to authenticated;
insert into auth.users(id,email,raw_user_meta_data)
select owner_id,owner_id::text||'@example.invalid','{"display_name":"Security test"}'::jsonb from security_test_ids
union all select partner_id,partner_id::text||'@example.invalid','{"display_name":"Security test"}'::jsonb from security_test_ids
union all select outsider_id,outsider_id::text||'@example.invalid','{"display_name":"Security test"}'::jsonb from security_test_ids;
insert into public.couples(id,created_by,relationship_started_at,invite_code,invite_expires_at)
select couple_id,owner_id,current_date,'T'||translate(upper(substr(replace(couple_id::text,'-',''),1,5)),'01','YZ'),now()+interval '1 day' from security_test_ids;
insert into public.couple_members(couple_id,user_id)
select couple_id,owner_id from security_test_ids;
insert into public.date_events(id,couple_id,created_by,title,event_date,category)
select event_id,couple_id,owner_id,'Security test',current_date,'important' from security_test_ids;
select set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true) is not null as claims_set from security_test_ids;
set local role authenticated;
do $$
declare ids record; note public.notes; wish uuid;
begin
  select * into ids from security_test_ids;
  if (select count(*) from public.date_events) <> 1 then raise exception 'Member visibility failed'; end if;
  update public.date_events set title='Updated' where id=ids.event_id;
  update public.profiles set display_name='Updated' where id=ids.owner_id;
  begin
    update public.date_events set created_by=ids.partner_id where id=ids.event_id;
    raise exception 'Protected column update was allowed';
  exception when insufficient_privilege then null; end;
  insert into public.wishes(couple_id,list,title,icon) values(ids.couple_id,'together','Test','heart') returning id into wish;
  update public.wishes set description='Test' where id=wish;
  insert into public.wish_comments(couple_id,wish_id,body) values(ids.couple_id,wish,'Test');
  select * into note from public.save_shared_note(ids.couple_id,null,0,'text','Test','', '[]'::jsonb,false,false);
  perform public.save_shared_note(ids.couple_id,note.id,note.version,'text','Updated','','[]'::jsonb,false,false);
  perform public.manage_date_category(ids.couple_id,'rename','important','Renamed');
  perform public.set_date_completion(ids.event_id,current_date,true);
  perform public.register_wish_device('ExpoPushToken[security-test-'||ids.owner_id::text||']');
  if public.is_couple_member(ids.couple_id,ids.partner_id) then raise exception 'Membership probe allowed'; end if;
end;
$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',outsider_id,'role','authenticated')::text,true) is not null as claims_set from security_test_ids;
set local role authenticated;
do $$
declare ids record; found_count integer;
begin
  select * into ids from security_test_ids;
  if exists(select 1 from public.date_events) or exists(select 1 from public.wishes)
    or exists(select 1 from public.notes) then raise exception 'Cross-pair read allowed'; end if;
  begin
    perform public.save_shared_note(ids.couple_id,null,0,'text','Bad','','[]'::jsonb,false,false);
    raise exception 'Cross-pair note write allowed';
  exception when insufficient_privilege then null; end;
  for i in 1..6 loop
    select count(*) into found_count from public.join_couple('!!!!!!');
    if found_count<>0 then raise exception 'Invalid code accepted'; end if;
  end loop;
  select count(*) into found_count from public.join_couple('T'||translate(upper(substr(replace(ids.couple_id::text,'-',''),1,5)),'01','YZ'));
  if found_count<>0 then raise exception 'Rate limit bypassed by valid code'; end if;
end;
$$;
reset role;
do $$
begin
  if (select attempts from public.couple_join_attempts where user_id=(select outsider_id from security_test_ids))<>5 then
    raise exception 'Failed attempts did not persist';
  end if;
end;
$$;
update public.couple_join_attempts set window_started_at=now()-interval '16 minutes'
  where user_id=(select outsider_id from security_test_ids);
set local role authenticated;
do $$
declare ids record; joined integer;
begin
  select * into ids from security_test_ids;
  select count(*) into joined from public.join_couple('T'||translate(upper(substr(replace(ids.couple_id::text,'-',''),1,5)),'01','YZ'));
  if joined<>1 then raise exception 'Join after cooldown failed'; end if;
  if not public.is_couple_member(ids.couple_id) then raise exception 'Joined membership not visible'; end if;
end;
$$;
reset role;
do $$
begin
  if has_function_privilege('anon','public.join_couple(text)','EXECUTE')
    or has_function_privilege('authenticated','public.claim_wish_jobs()','EXECUTE')
    or has_table_privilege('authenticated','public.date_events','TRUNCATE')
    or has_table_privilege('anon','public.profiles','SELECT') then raise exception 'Excessive permissions remain'; end if;
  if not has_function_privilege('service_role','public.claim_wish_jobs()','EXECUTE') then raise exception 'Worker blocked'; end if;
end;
$$;
select 'PASS: permissions, member CRUD/RPC, cross-pair isolation, failed-attempt persistence, cooldown and worker access' as result;
