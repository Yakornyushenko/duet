begin;

create or replace function public.enforce_wish_photo_limit() returns trigger
language plpgsql set search_path = public as $$
begin
  if cardinality(new.photos) <= 1 then
    return new;
  end if;

  -- Preserve legacy wishes without allowing more photos to be added.
  if tg_op = 'UPDATE'
    and new.photos <@ old.photos
    and cardinality(new.photos) <= cardinality(old.photos) then
    return new;
  end if;

  raise exception 'К желанию можно прикрепить только одну фотографию';
end;
$$;

drop trigger if exists enforce_wish_photo_limit on public.wishes;
create trigger enforce_wish_photo_limit
before insert or update of photos on public.wishes
for each row execute function public.enforce_wish_photo_limit();

commit;
