create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  relationship_started_at date not null check (relationship_started_at <= current_date),
  invite_code varchar(6) unique,
  invite_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invite_fields_are_paired check (
    (invite_code is null and invite_expires_at is null)
    or (invite_code is not null and invite_expires_at is not null)
  )
);

create table public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

create type public.date_recurrence as enum ('none', 'yearly');
create type public.date_event_icon as enum ('heart', 'sparkles', 'gift', 'cake', 'plane');

create table public.date_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  event_date date not null,
  recurrence public.date_recurrence not null default 'yearly',
  icon public.date_event_icon not null default 'heart',
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index date_events_couple_id_idx on public.date_events(couple_id);
create index couple_members_couple_id_idx on public.couple_members(couple_id);
create index couples_active_invite_idx on public.couples(invite_code) where invite_code is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger couples_set_updated_at
before update on public.couples
for each row execute function public.set_updated_at();

create trigger date_events_set_updated_at
before update on public.date_events
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_name text;
begin
  requested_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1));
  if requested_name is null or char_length(requested_name) < 2 then
    requested_name := 'Пользователь';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, left(requested_name, 50));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_couple_member(p_couple_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.couple_members
    where couple_id = p_couple_id and user_id = p_user_id
  );
$$;

create or replace function public.shares_couple_with(p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.couple_members mine
    join public.couple_members theirs on theirs.couple_id = mine.couple_id
    where mine.user_id = auth.uid() and theirs.user_id = p_other_user_id
  );
$$;

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

create or replace function public.join_couple(p_invite_code text)
returns setof public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text := upper(trim(p_invite_code));
  target_couple public.couples;
begin
  if auth.uid() is null then
    raise exception 'Сначала войдите в аккаунт';
  end if;
  if exists (select 1 from public.couple_members where user_id = auth.uid()) then
    raise exception 'Вы уже состоите в паре';
  end if;

  select *
  into target_couple
  from public.couples
  where invite_code = normalized_code and invite_expires_at > now()
  for update;

  if not found then
    raise exception 'Код не найден или уже истёк';
  end if;
  if (select count(*) from public.couple_members where couple_id = target_couple.id) >= 2 then
    raise exception 'В этой паре уже два человека';
  end if;

  insert into public.couple_members (couple_id, user_id)
  values (target_couple.id, auth.uid());

  update public.couples
  set invite_code = null, invite_expires_at = null
  where id = target_couple.id
  returning * into target_couple;

  return next target_couple;
end;
$$;

alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.date_events enable row level security;

create policy "profiles_visible_to_self_and_partner"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.shares_couple_with(id));

create policy "users_update_own_profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "members_view_their_couple"
on public.couples for select
to authenticated
using (public.is_couple_member(id));

create policy "members_view_membership"
on public.couple_members for select
to authenticated
using (public.is_couple_member(couple_id));

create policy "members_view_dates"
on public.date_events for select
to authenticated
using (public.is_couple_member(couple_id));

create policy "members_add_dates"
on public.date_events for insert
to authenticated
with check (public.is_couple_member(couple_id) and created_by = auth.uid());

create policy "members_update_dates"
on public.date_events for update
to authenticated
using (public.is_couple_member(couple_id))
with check (public.is_couple_member(couple_id));

create policy "members_delete_dates"
on public.date_events for delete
to authenticated
using (public.is_couple_member(couple_id));

revoke all on function public.create_couple(date) from public;
revoke all on function public.join_couple(text) from public;
revoke all on function public.is_couple_member(uuid, uuid) from public;
revoke all on function public.shares_couple_with(uuid) from public;
grant execute on function public.create_couple(date) to authenticated;
grant execute on function public.join_couple(text) to authenticated;
grant execute on function public.is_couple_member(uuid, uuid) to authenticated;
grant execute on function public.shares_couple_with(uuid) to authenticated;

grant select, update on public.profiles to authenticated;
grant select on public.couples to authenticated;
grant select on public.couple_members to authenticated;
grant select, insert, delete on public.date_events to authenticated;
grant update (title, event_date, recurrence, icon) on public.date_events to authenticated;

alter publication supabase_realtime add table public.couple_members;
alter publication supabase_realtime add table public.date_events;
