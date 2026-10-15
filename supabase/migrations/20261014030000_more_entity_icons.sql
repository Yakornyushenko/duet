begin;

alter type public.date_event_icon add value if not exists 'calendar';
alter type public.date_event_icon add value if not exists 'balloon';
alter type public.date_event_icon add value if not exists 'people';
alter type public.date_event_icon add value if not exists 'wine';
alter type public.date_event_icon add value if not exists 'time';
alter type public.date_event_icon add value if not exists 'game';
alter type public.date_event_icon add value if not exists 'headphones';
alter type public.date_event_icon add value if not exists 'phone';
alter type public.date_event_icon add value if not exists 'watch';
alter type public.date_event_icon add value if not exists 'bicycle';
alter type public.date_event_icon add value if not exists 'car';
alter type public.date_event_icon add value if not exists 'boat';
alter type public.date_event_icon add value if not exists 'bag';

alter table public.notes drop constraint if exists notes_icon_check;
alter table public.notes add constraint notes_icon_check check (icon in (
  'note', 'checklist', 'idea', 'bookmark', 'flag',
  'chat', 'pencil', 'clipboard', 'folder', 'link',
  'attach', 'list', 'grid', 'document', 'archive'
));

commit;
