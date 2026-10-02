-- Apply manually after personal_workspaces. No external scheduler is created here.
begin;
create table public.daily_questions (
  id uuid primary key default gen_random_uuid(), body text not null check(length(body) between 5 and 500),
  topic text not null, intimate boolean not null default false, active boolean not null default true
);
create table public.question_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default false, push_enabled boolean not null default true,
  intimate boolean not null default false, adult_confirmed boolean not null default false,
  introduced boolean not null default false
);
create table public.question_schedule (
  couple_id uuid primary key references public.couples(id) on delete cascade,
  at_time time not null default '19:00', timezone text not null default 'Europe/Minsk'
);
create table public.couple_daily_questions (
  id uuid primary key default gen_random_uuid(), couple_id uuid not null references public.couples(id),
  question_id uuid not null references public.daily_questions(id), day date not null,
  body text not null, intimate boolean not null, revealed boolean not null default false,
  skipped boolean not null default false, cancelled boolean not null default false,
  unique(couple_id,day)
);
create table public.daily_question_answers (
  question_id uuid not null references public.couple_daily_questions(id) on delete cascade,
  user_id uuid not null references public.profiles(id), body text not null check(length(trim(body)) between 1 and 4000),
  primary key(question_id,user_id)
);
-- All reads go through a deliberately redacted RPC, including Realtime clients.
do $$ declare t text; begin
  foreach t in array array['daily_questions','question_preferences','question_schedule','couple_daily_questions','daily_question_answers'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
  end loop;
end $$;
alter table public.wish_jobs add column daily_question_id uuid references public.couple_daily_questions(id);
create unique index question_push_once on public.wish_jobs(daily_question_id,recipient_id) where daily_question_id is not null;

-- Original editorial starter questions, not copied from published exercises.
insert into public.daily_questions(body,topic,intimate) values
 ('Какой обычный день со мной тебе особенно запомнился?','Воспоминания',false),
 ('Какая моя небольшая привычка помогает тебе чувствовать заботу?','Поддержка',false),
 ('Какую небольшую традицию ты хочешь создать вместе?','Будущее',false),
 ('В какой момент дня тебе особенно хочется побыть вдвоём?','Повседневность',false),
 ('Как мне показать, что я слушаю тебя внимательно?','Общение',false),
 ('Какое наше совместное занятие даёт тебе больше всего энергии?','Вместе',false),
 ('Чему тебе хотелось бы научиться вместе со мной?','Будущее',false),
 ('Какой мой поступок за последнее время вызвал у тебя улыбку?','Благодарность',false),
 ('Что помогает тебе отдохнуть рядом со мной после трудного дня?','Поддержка',false),
 ('Каким ты представляешь наш идеальный свободный вечер?','Повседневность',false),
 ('Какое место тебе хочется однажды показать мне и почему?','Мечты',false),
 ('О чём тебе хотелось бы чаще разговаривать со мной?','Общение',false),
 ('Какая наша общая маленькая победа особенно важна для тебя?','Воспоминания',false),
 ('Как мне бережно дать тебе пространство, когда хочется побыть одному?','Границы',false),
 ('Какой знак внимания без подарков особенно приятен тебе?','Забота',false),
 ('Что нового о тебе мне было бы интересно узнать сейчас?','Знакомство',false),
 ('Какие прикосновения помогают тебе чувствовать нежность и близость?','Нежность',true),
 ('Как тебе комфортнее говорить мне о своих желаниях в интимной близости?','Интимное общение',true),
 ('Как мне дать понять, что отказ от близости не меняет моего отношения к тебе?','Согласие',true),
 ('Какая обстановка помогает тебе расслабиться перед интимной близостью?','Комфорт',true);

create function public.ensure_daily_question(p_couple uuid) returns void
language plpgsql security definer set search_path=public as $$
declare settings public.question_schedule; chosen public.daily_questions; local_day date; allow_intimate boolean;
begin
  perform 1 from public.couples where id=p_couple for update;
  if (select count(*) from public.couple_members where couple_id=p_couple)<>2
    or (select count(*) from public.couple_members m join public.question_preferences p on p.user_id=m.user_id
      where m.couple_id=p_couple and p.enabled)<>2 then return; end if;
  insert into public.question_schedule(couple_id) values(p_couple) on conflict do nothing;
  select * into settings from public.question_schedule where couple_id=p_couple;
  local_day:=(now() at time zone settings.timezone)::date;
  if exists(select 1 from public.couple_daily_questions where couple_id=p_couple and day=local_day) then return; end if;
  select count(*)=2 into allow_intimate from public.couple_members m join public.question_preferences p on p.user_id=m.user_id
    where m.couple_id=p_couple and p.intimate and p.adult_confirmed;
  select * into chosen from public.daily_questions q where q.active and (not q.intimate or allow_intimate)
    and not exists(select 1 from public.couple_daily_questions d where d.couple_id=p_couple and d.question_id=q.id)
    order by random() limit 1;
  -- Exhausted bank: no silent repetition; add new questions to resume assignment.
  if chosen.id is null then return; end if;
  insert into public.couple_daily_questions(couple_id,question_id,day,body,intimate)
    values(p_couple,chosen.id,local_day,chosen.body,chosen.intimate);
end $$;

create function public.set_question_preferences(p_patch jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare workspace uuid; k text;
begin
  if auth.uid() is null then raise exception 'Войдите в аккаунт'; end if;
  select couple_id into workspace from public.couple_members where user_id=auth.uid();
  perform 1 from public.couples where id=workspace for update;
  if jsonb_typeof(p_patch) is distinct from 'object' then raise exception 'Некорректные настройки'; end if;
  for k in select jsonb_object_keys(p_patch) loop
    if k not in ('enabled','push_enabled','intimate','adult_confirmed','introduced')
      or jsonb_typeof(p_patch->k)<>'boolean' then raise exception 'Некорректные настройки'; end if;
  end loop;
  insert into public.question_preferences(user_id) values(auth.uid()) on conflict do nothing;
  update public.question_preferences set
    enabled=coalesce((p_patch->>'enabled')::boolean,enabled),
    push_enabled=coalesce((p_patch->>'push_enabled')::boolean,push_enabled),
    intimate=coalesce((p_patch->>'intimate')::boolean,intimate),
    adult_confirmed=coalesce((p_patch->>'adult_confirmed')::boolean,adult_confirmed),
    introduced=coalesce((p_patch->>'introduced')::boolean,introduced)
    where user_id=auth.uid();
  if exists(select 1 from public.question_preferences where user_id=auth.uid() and intimate and not adult_confirmed) then
    raise exception 'Подтвердите, что вам исполнилось 18 лет';
  end if;
  -- Withdrawal is immediate; unread intimate answers are never disclosed afterwards.
  if exists(select 1 from public.question_preferences where user_id=auth.uid() and not intimate) then
    update public.couple_daily_questions set cancelled=true where couple_id=workspace and intimate and not revealed;
  end if;
end $$;

create function public.set_question_schedule(p_time text,p_timezone text) returns void
language plpgsql security definer set search_path=public as $$
declare workspace uuid;
begin
  select couple_id into workspace from public.couple_members where user_id=auth.uid();
  if workspace is null then raise exception 'Нет доступа'; end if;
  perform 1 from public.couples where id=workspace for update;
  if p_time is null or p_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    or not exists(select 1 from pg_timezone_names where name=p_timezone) then raise exception 'Проверьте время и часовой пояс'; end if;
  insert into public.question_schedule(couple_id,at_time,timezone) values(workspace,p_time::time,p_timezone)
    on conflict(couple_id) do update set at_time=excluded.at_time,timezone=excluded.timezone;
end $$;

create function public.daily_question_state() returns jsonb
language plpgsql security definer set search_path=public as $$
declare workspace uuid; prefs public.question_preferences; settings public.question_schedule; ready boolean; intimate_ready boolean; history jsonb;
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
  select coalesce(jsonb_agg(row order by day desc),'[]') into history from (
    select d.day,jsonb_build_object('id',d.id,'day',d.day,'body',case when d.cancelled then 'Личный вопрос отменён' else d.body end,
      'intimate',d.intimate,'revealed',d.revealed,'skipped',d.skipped,'cancelled',d.cancelled,
      'answered_count',(select count(*) from public.daily_question_answers a where a.question_id=d.id),
      'answers',coalesce((select jsonb_agg(jsonb_build_object('user_id',a.user_id,'name',p.display_name,'body',a.body))
        from public.daily_question_answers a join public.profiles p on p.id=a.user_id
        where a.question_id=d.id and (a.user_id=auth.uid() or d.revealed) and not d.cancelled),'[]')) row
    from public.couple_daily_questions d where d.couple_id=workspace order by d.day desc limit 90
  ) r;
  return jsonb_build_object('preferences',to_jsonb(prefs),'time',to_char(settings.at_time,'HH24:MI'),
    'timezone',settings.timezone,'today',(now() at time zone settings.timezone)::date,
    'active',ready,'intimate_active',intimate_ready,'questions',history);
end $$;

create function public.answer_daily_question(p_id uuid,p_body text,p_skip boolean default false) returns void
language plpgsql security definer set search_path=public as $$
declare q public.couple_daily_questions; workspace uuid;
begin
  select couple_id into workspace from public.couple_members where user_id=auth.uid();
  perform 1 from public.couples where id=workspace for update;
  select * into q from public.couple_daily_questions where id=p_id and couple_id=workspace for update;
  if not found then raise exception 'Нет доступа к вопросу'; end if;
  if q.revealed or q.skipped or q.cancelled then raise exception 'Ответы на этот вопрос уже закрыты'; end if;
  if (select count(*) from public.couple_members where couple_id=workspace)<>2 then raise exception 'Пригласите партнёра'; end if;
  if q.intimate and (select count(*) from public.couple_members m join public.question_preferences p on p.user_id=m.user_id
    where m.couple_id=workspace and p.intimate and p.adult_confirmed)<>2 then raise exception 'Интимные вопросы отключены'; end if;
  if p_skip then update public.couple_daily_questions set skipped=true where id=p_id; return; end if;
  if p_body is null or length(trim(p_body)) not between 1 and 4000 then raise exception 'Введите ответ до 4000 символов'; end if;
  insert into public.daily_question_answers(question_id,user_id,body) values(p_id,auth.uid(),trim(p_body))
    on conflict(question_id,user_id) do update set body=excluded.body;
  if (select count(*) from public.daily_question_answers a join public.couple_members m on m.user_id=a.user_id
    where a.question_id=p_id and m.couple_id=workspace)=2 then
    update public.couple_daily_questions set revealed=true where id=p_id;
  end if;
end $$;

-- Called once per minute by the existing private worker. Unique jobs prevent normal duplicate scheduling.
create function public.enqueue_daily_questions() returns void
language plpgsql security definer set search_path=public as $$
declare s public.question_schedule;
begin
  for s in select * from public.question_schedule where (now() at time zone timezone)::time>=at_time loop
    perform public.ensure_daily_question(s.couple_id);
    insert into public.wish_jobs(couple_id,recipient_id,daily_question_id,message)
      select d.couple_id,m.user_id,d.id,'Вопрос дня' from public.couple_daily_questions d
      join public.couple_members m on m.couple_id=d.couple_id
      join public.question_preferences p on p.user_id=m.user_id
      where d.couple_id=s.couple_id and d.day=(now() at time zone s.timezone)::date
        and not d.skipped and not d.cancelled and not d.revealed and p.enabled and p.push_enabled
        and (select count(*) from public.couple_members cm join public.question_preferences cp on cp.user_id=cm.user_id
          where cm.couple_id=s.couple_id and cp.enabled)=2
        and not exists(select 1 from public.daily_question_answers a where a.question_id=d.id and a.user_id=m.user_id)
      on conflict(daily_question_id,recipient_id) where daily_question_id is not null do nothing;
  end loop;
end $$;

-- Recheck consent immediately before delivery; never put an intimate question on the lock screen.
create function public.daily_question_delivery(p_id uuid,p_user uuid) returns text
language sql security definer set search_path=public as $$
  select case when d.intimate then 'Для вас новый личный вопрос' else d.body end
  from public.couple_daily_questions d join public.question_schedule s on s.couple_id=d.couple_id
  where d.id=p_id and not d.skipped and not d.cancelled and not d.revealed
    and d.day=(now() at time zone s.timezone)::date and (now() at time zone s.timezone)::time>=s.at_time
    and exists(select 1 from public.couple_members m join public.question_preferences p on p.user_id=m.user_id
      where m.couple_id=d.couple_id and m.user_id=p_user and p.push_enabled)
    and (select count(*) from public.couple_members m join public.question_preferences p on p.user_id=m.user_id
      where m.couple_id=d.couple_id and p.enabled and (not d.intimate or (p.intimate and p.adult_confirmed)))=2
    and not exists(select 1 from public.daily_question_answers a where a.question_id=d.id and a.user_id=p_user);
$$;
revoke all on function public.ensure_daily_question(uuid),public.set_question_preferences(jsonb),public.set_question_schedule(text,text),
  public.daily_question_state(),public.answer_daily_question(uuid,text,boolean),public.enqueue_daily_questions(),public.daily_question_delivery(uuid,uuid) from public,anon,authenticated;
grant execute on function public.set_question_preferences(jsonb),public.set_question_schedule(text,text),public.daily_question_state(),public.answer_daily_question(uuid,text,boolean) to authenticated;
grant execute on function public.enqueue_daily_questions(),public.daily_question_delivery(uuid,uuid) to service_role;
commit;
