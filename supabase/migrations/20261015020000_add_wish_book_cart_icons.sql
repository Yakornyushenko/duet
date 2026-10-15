begin;

alter type public.date_event_icon add value if not exists 'book';
alter type public.date_event_icon add value if not exists 'cart';

commit;
