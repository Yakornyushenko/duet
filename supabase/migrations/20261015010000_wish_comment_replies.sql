begin;

alter table public.wish_comments
  add column reply_to uuid,
  add constraint wish_comments_reply_to_fkey
    foreign key (reply_to) references public.wish_comments(id) on delete set null,
  add constraint wish_comments_no_self_reply check (reply_to is null or reply_to <> id);

create index wish_comments_reply_to_idx on public.wish_comments(reply_to) where reply_to is not null;

create function public.is_valid_wish_comment_reply(p_reply_to uuid, p_wish_id uuid, p_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_reply_to is null or exists (
    select 1
    from public.wish_comments c
    where c.id = p_reply_to
      and c.wish_id = p_wish_id
      and c.couple_id = p_couple_id
  )
$$;

revoke all on function public.is_valid_wish_comment_reply(uuid,uuid,uuid) from public;
grant execute on function public.is_valid_wish_comment_reply(uuid,uuid,uuid) to authenticated;

drop policy comments_add on public.wish_comments;
create policy comments_add on public.wish_comments for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_couple_member(couple_id)
    and exists (
      select 1 from public.wishes w
      where w.id = wish_id and w.couple_id = wish_comments.couple_id
    )
    and public.is_valid_wish_comment_reply(reply_to, wish_id, couple_id)
  );

grant insert(reply_to) on public.wish_comments to authenticated;

commit;
