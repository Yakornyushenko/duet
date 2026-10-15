import { AppIconName } from '@/components/AppIcon';
import { EntityIcon } from '@/types/domain';

export type EntityIconKind = 'date' | 'wish' | 'note';

export const entityIcons: Record<EntityIcon, AppIconName> = {
  heart: 'heart-outline',
  sparkles: 'sparkles-outline',
  gift: 'gift-outline',
  cake: 'calendar-number-outline',
  plane: 'airplane-outline',
  sun: 'sunny-outline',
  moon: 'moon-outline',
  cafe: 'cafe-outline',
  restaurant: 'restaurant-outline',
  film: 'film-outline',
  music: 'musical-notes-outline',
  camera: 'camera-outline',
  flower: 'flower-outline',
  home: 'home-outline',
  fitness: 'fitness-outline',
  note: 'document-text-outline',
  checklist: 'checkbox-outline',
  idea: 'bulb-outline',
  bookmark: 'bookmark-outline',
  book: 'book-outline',
  cart: 'cart-outline',
  flag: 'flag-outline',
  chat: 'chatbubble-ellipses-outline',
  calendar: 'calendar-outline',
  balloon: 'balloon-outline',
  people: 'people-outline',
  wine: 'wine-outline',
  time: 'time-outline',
  game: 'game-controller-outline',
  headphones: 'headset-outline',
  phone: 'phone-portrait-outline',
  watch: 'watch-outline',
  bicycle: 'bicycle-outline',
  car: 'car-sport-outline',
  boat: 'boat-outline',
  bag: 'bag-handle-outline',
  pencil: 'pencil-outline',
  clipboard: 'clipboard-outline',
  folder: 'folder-outline',
  link: 'link-outline',
  attach: 'attach-outline',
  list: 'list-outline',
  grid: 'grid-outline',
  document: 'document-outline',
  archive: 'archive-outline',
};

export const entityIconLabels: Record<EntityIcon, string> = {
  heart: 'Любовь', sparkles: 'Мечта', gift: 'Подарок', cake: 'Праздник', plane: 'Путешествие',
  sun: 'Солнце', moon: 'Вечер', cafe: 'Кофе', restaurant: 'Ужин', film: 'Кино',
  music: 'Музыка', camera: 'Фотография', flower: 'Цветы', home: 'Дом', fitness: 'Спорт',
  note: 'Заметка', checklist: 'Список', idea: 'Идея', bookmark: 'Важное', book: 'Книга',
  cart: 'Покупки', flag: 'Цель', chat: 'Разговор',
  calendar: 'Дата', balloon: 'Праздник', people: 'Встреча', wine: 'Особый вечер', time: 'Время',
  game: 'Игры', headphones: 'Наушники', phone: 'Телефон', watch: 'Часы', bicycle: 'Велосипед',
  car: 'Автомобиль', boat: 'Морская поездка', bag: 'Покупка',
  pencil: 'Запись', clipboard: 'План', folder: 'Папка', link: 'Ссылка', attach: 'Вложение',
  list: 'Перечень', grid: 'Подборка', document: 'Документ', archive: 'Архив',
};

export const entityIconGroups: Record<EntityIconKind, readonly EntityIcon[]> = {
  date: [
    'heart', 'cake', 'plane', 'sun', 'moon',
    'cafe', 'restaurant', 'film', 'music', 'flower',
    'calendar', 'balloon', 'people', 'wine', 'time',
  ],
  wish: [
    'sparkles', 'gift', 'camera', 'home', 'fitness',
    'book', 'cart', 'game', 'headphones', 'phone',
    'watch', 'bicycle', 'car', 'boat', 'bag',
  ],
  note: [
    'note', 'checklist', 'idea', 'bookmark', 'flag',
    'chat', 'pencil', 'clipboard', 'folder', 'link',
    'attach', 'list', 'grid', 'document', 'archive',
  ],
};

export const defaultEntityIcons: Record<EntityIconKind, EntityIcon> = {
  date: 'heart',
  wish: 'sparkles',
  note: 'note',
};
