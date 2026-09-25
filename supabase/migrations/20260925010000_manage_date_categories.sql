begin;
create table public.date_categories (
  couple_id uuid not null references public.couples(id) on delete cascade,
  value text not null,
  label text not null check (char_length(trim(label)) between 1 and 40),
  custom_slot integer check (custom_slot in (1, 2)),
  position integer not null,
  primary key (couple_id, value),
  unique (couple_id, custom_slot)
);
create unique index date_categories_unique_name on public.date_categories(couple_id, lower(trim(label)));
alter table public.date_categories enable row level security;
create policy categories_read on public.date_categories for select to authenticated
  using (public.is_couple_member(couple_id));
revoke all on public.date_categories from anon, authenticated;
grant select on public.date_categories to authenticated;

insert into public.date_categories(couple_id, value, label, position)
select c.id, d.value, d.label, d.position from public.couples c cross join
  (values ('important', 'Важные даты', 0), ('travel', 'Путешествия', 1),
    ('dates', 'Свидания', 2), ('other', 'Разное', 3)) d(value, label, position);

create function public.seed_date_categories() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.date_categories(couple_id, value, label, position) values
    (new.id, 'important', 'Важные даты', 0), (new.id, 'travel', 'Путешествия', 1),
    (new.id, 'dates', 'Свидания', 2), (new.id, 'other', 'Разное', 3);
  return new;
end $$;
revoke all on function public.seed_date_categories() from public;
create trigger seed_date_categories after insert on public.couples
  for each row execute function public.seed_date_categories();

alter table public.date_events drop constraint date_events_category_check;
alter table public.date_events add constraint date_events_category_fk
  foreign key (couple_id, category) references public.date_categories(couple_id, value) on delete cascade;

-- Serialize management by couple: concurrent partners cannot exceed two custom slots.
create function public.manage_date_category(p_couple_id uuid, p_action text, p_value text default null, p_label text default null)
returns void language plpgsql security definer set search_path = public as $$
declare slot integer;
begin
  if auth.uid() is null or not public.is_couple_member(p_couple_id) then
    raise exception 'Нет доступа к категориям этой пары';
  end if;
  perform 1 from public.couples where id = p_couple_id for update;
  if p_action in ('add', 'rename') and (p_label is null or char_length(trim(p_label)) not between 1 and 40) then
    raise exception 'Введите название от 1 до 40 символов';
  end if;
  if p_action = 'add' then
    select s into slot from generate_series(1, 2) s where not exists
      (select 1 from public.date_categories where couple_id = p_couple_id and custom_slot = s)
      order by s limit 1;
    if slot is null then raise exception 'Нельзя добавить ещё одну категорию'; end if;
    insert into public.date_categories(couple_id, value, label, custom_slot, position)
      values(p_couple_id, 'custom_' || gen_random_uuid()::text, trim(p_label), slot, 3 + slot);
  elsif p_action = 'rename' then
    update public.date_categories set label = trim(p_label) where couple_id = p_couple_id and value = p_value;
    if not found then raise exception 'Категория уже удалена'; end if;
  elsif p_action = 'delete' then
    delete from public.date_categories where couple_id = p_couple_id and value = p_value;
    if not found then raise exception 'Категория уже удалена'; end if;
  else
    raise exception 'Неизвестное действие';
  end if;
end $$;
revoke all on function public.manage_date_category(uuid, text, text, text) from public;
grant execute on function public.manage_date_category(uuid, text, text, text) to authenticated;
alter publication supabase_realtime add table public.date_categories;
commit;
