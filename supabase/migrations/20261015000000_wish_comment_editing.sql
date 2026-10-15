begin;

create policy comments_update on public.wish_comments
  for update to authenticated
  using (author_id = auth.uid() and public.is_couple_member(couple_id))
  with check (
    author_id = auth.uid()
    and public.is_couple_member(couple_id)
    and exists (
      select 1
      from public.wishes w
      where w.id = wish_id and w.couple_id = wish_comments.couple_id
    )
  );

grant update(body) on public.wish_comments to authenticated;

commit;
