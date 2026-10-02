begin;
create function public.daily_question_detail(p_id uuid) returns jsonb
language sql security definer set search_path=public as $$
  select jsonb_build_object('id',d.id,'day',d.day,
    'body',case when d.cancelled then 'Личный вопрос отменён' else d.body end,
    'intimate',d.intimate,'revealed',d.revealed,'skipped',d.skipped,'cancelled',d.cancelled,
    'answered_count',(select count(*) from public.daily_question_answers a where a.question_id=d.id),
    'answers',coalesce((select jsonb_agg(jsonb_build_object('user_id',a.user_id,'name',p.display_name,'body',a.body))
      from public.daily_question_answers a join public.profiles p on p.id=a.user_id
      where a.question_id=d.id and (a.user_id=auth.uid() or d.revealed) and not d.cancelled),'[]'))
  from public.couple_daily_questions d where d.id=p_id
    and exists(select 1 from public.couple_members m where m.couple_id=d.couple_id and m.user_id=auth.uid());
$$;
revoke all on function public.daily_question_detail(uuid) from public,anon,authenticated;
grant execute on function public.daily_question_detail(uuid) to authenticated;
commit;
