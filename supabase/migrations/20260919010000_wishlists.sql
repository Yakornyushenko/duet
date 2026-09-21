begin;
create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  list text not null check (list in ('together', 'creator', 'partner')),
  title text not null check (char_length(trim(title)) between 1 and 200),
  fulfilled boolean not null default false,
  created_at timestamptz not null default now()
);
create index wishes_couple_id_idx on public.wishes(couple_id);
alter table public.wishes enable row level security;
create policy "members_read_wishes" on public.wishes for select to authenticated
  using (public.is_couple_member(couple_id));
create policy "members_add_wishes" on public.wishes for insert to authenticated
  with check (public.is_couple_member(couple_id));
create policy "members_update_wishes" on public.wishes for update to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
create policy "members_delete_wishes" on public.wishes for delete to authenticated
  using (public.is_couple_member(couple_id));
grant select, insert, delete on public.wishes to authenticated;
grant update (title, fulfilled) on public.wishes to authenticated;
alter publication supabase_realtime add table public.wishes;
commit;
