create or replace function public.update_relationship_started_at(p_relationship_started_at date)
returns setof public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_couple public.couples;
begin
  if auth.uid() is null then
    raise exception 'Сначала войдите в аккаунт';
  end if;
  if p_relationship_started_at is null then
    raise exception 'Укажите дату начала отношений';
  end if;
  if p_relationship_started_at > current_date then
    raise exception 'Дата начала отношений не может быть в будущем';
  end if;

  update public.couples
  set relationship_started_at = p_relationship_started_at
  where id = (
    select couple_id
    from public.couple_members
    where user_id = auth.uid()
  )
  returning * into updated_couple;

  if not found then
    raise exception 'Пара не найдена';
  end if;

  return next updated_couple;
end;
$$;

revoke all on function public.update_relationship_started_at(date) from public;
grant execute on function public.update_relationship_started_at(date) to authenticated;

alter table public.profiles drop constraint profiles_display_name_check;
alter table public.profiles add constraint profiles_display_name_check
  check (char_length(display_name) between 1 and 50);

alter publication supabase_realtime add table public.couples;
alter publication supabase_realtime add table public.profiles;
