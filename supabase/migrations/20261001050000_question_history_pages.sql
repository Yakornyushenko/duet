-- Apply manually after 20261001040000_daily_questions.sql.
begin;
create function public.daily_question_history(p_before date default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare workspace uuid; result jsonb; more boolean;
begin
  select couple_id into workspace from public.couple_members where user_id=auth.uid();
  if workspace is null then raise exception 'Нет доступа'; end if;
  select count(*)>20 into more from (select 1 from public.couple_daily_questions
    where couple_id=workspace and (p_before is null or day<p_before) order by day desc limit 21) x;
  select coalesce(jsonb_agg(row order by day desc),'[]') into result from (
    select d.day,jsonb_build_object('id',d.id,'day',d.day,'body',case when d.cancelled then 'Личный вопрос отменён' else d.body end,
      'intimate',d.intimate,'revealed',d.revealed,'skipped',d.skipped,'cancelled',d.cancelled,
      'answered_count',(select count(*) from public.daily_question_answers a where a.question_id=d.id),
      'answers',coalesce((select jsonb_agg(jsonb_build_object('user_id',a.user_id,'name',p.display_name,'body',a.body))
        from public.daily_question_answers a join public.profiles p on p.id=a.user_id
        where a.question_id=d.id and (a.user_id=auth.uid() or d.revealed) and not d.cancelled),'[]')) row
    from public.couple_daily_questions d where d.couple_id=workspace and (p_before is null or d.day<p_before)
    order by d.day desc limit 20
  ) r;
  return jsonb_build_object('questions',result,'has_more',more);
end $$;
create or replace function public.daily_question_state() returns jsonb
language plpgsql security definer set search_path=public as $$
declare workspace uuid; prefs public.question_preferences; settings public.question_schedule; ready boolean; intimate_ready boolean;
begin
  select couple_id into workspace from public.couple_members where user_id=auth.uid();
  if workspace is null then raise exception 'Войдите в аккаунт'; end if;
  perform 1 from public.couples where id=workspace for update;
  insert into public.question_preferences(user_id) values(auth.uid()) on conflict do nothing;
  select * into prefs from public.question_preferences where user_id=auth.uid();
  insert into public.question_schedule(couple_id) values(workspace) on conflict do nothing;
  select * into settings from public.question_schedule where couple_id=workspace;
  select count(*)=2 into ready from public.couple_members m join public.question_preferences p on m.user_id=p.user_id where m.couple_id=workspace and p.enabled;
  select count(*)=2 into intimate_ready from public.couple_members m join public.question_preferences p on m.user_id=p.user_id where m.couple_id=workspace and p.intimate and p.adult_confirmed;
  perform public.ensure_daily_question(workspace);
  return jsonb_build_object('preferences',to_jsonb(prefs),'time',to_char(settings.at_time,'HH24:MI'),
    'timezone',settings.timezone,'today',(now() at time zone settings.timezone)::date,
    'active',ready,'intimate_active',intimate_ready)||public.daily_question_history(null);
end $$;
revoke all on function public.daily_question_history(date) from public,anon,authenticated;
grant execute on function public.daily_question_history(date) to authenticated;
commit;
