create or replace function public.create_couple(p_relationship_started_at date)
returns setof public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_code text;
  created_couple public.couples;
begin
  if auth.uid() is null then
    raise exception 'Сначала войдите в аккаунт';
  end if;
  if p_relationship_started_at > current_date then
    raise exception 'Дата начала отношений не может быть в будущем';
  end if;
  if exists (select 1 from public.couple_members where user_id = auth.uid()) then
    raise exception 'Вы уже состоите в паре';
  end if;

  loop
    select string_agg(
      substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (get_byte(random_bytes, byte_index) % 32) + 1, 1),
      '' order by byte_index
    )
    into generated_code
    from (select extensions.gen_random_bytes(6) as random_bytes) entropy
    cross join generate_series(0, 5) as bytes(byte_index);
    exit when not exists (select 1 from public.couples where invite_code = generated_code);
  end loop;

  insert into public.couples (created_by, relationship_started_at, invite_code, invite_expires_at)
  values (auth.uid(), p_relationship_started_at, generated_code, now() + interval '24 hours')
  returning * into created_couple;

  insert into public.couple_members (couple_id, user_id)
  values (created_couple.id, auth.uid());

  return next created_couple;
end;
$$;

revoke all on function public.create_couple(date) from public;
grant execute on function public.create_couple(date) to authenticated;
