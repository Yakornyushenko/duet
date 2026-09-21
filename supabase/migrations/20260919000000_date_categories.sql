begin;

alter table public.date_events
  add column if not exists category text not null default 'important'
  constraint date_events_category_check
  check (category in ('important', 'travel', 'dates', 'other'));

commit;
