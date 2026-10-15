begin;

create function public.can_manage_wishlist(p_couple_id uuid, p_list text) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1
    from public.couples c
    join public.couple_members m on m.couple_id = c.id and m.user_id = auth.uid()
    where c.id = p_couple_id
      and (
        p_list = 'together'
        or (p_list = 'creator' and c.created_by = auth.uid())
        or (p_list = 'partner' and c.created_by <> auth.uid())
      )
  );
$$;
revoke all on function public.can_manage_wishlist(uuid, text) from public;
grant execute on function public.can_manage_wishlist(uuid, text) to authenticated;

drop policy if exists "members_add_wishes" on public.wishes;
drop policy if exists "members_update_wishes" on public.wishes;
drop policy if exists "members_delete_wishes" on public.wishes;

create policy "owners_add_wishes" on public.wishes for insert to authenticated
  with check (public.can_manage_wishlist(couple_id, list));
create policy "owners_update_wishes" on public.wishes for update to authenticated
  using (public.can_manage_wishlist(couple_id, list))
  with check (public.can_manage_wishlist(couple_id, list));
create policy "owners_delete_wishes" on public.wishes for delete to authenticated
  using (public.can_manage_wishlist(couple_id, list));

commit;
