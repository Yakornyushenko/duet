import { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';

import { DateEventIcon } from '@/types/domain';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export const eventIcons: Record<DateEventIcon, IoniconName> = {
  heart: 'heart-outline',
  sparkles: 'sparkles-outline',
  gift: 'gift-outline',
  cake: 'calendar-outline',
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
};

export const iconLabels: Record<DateEventIcon, string> = {
  heart: 'Любовь', sparkles: 'Событие', gift: 'Подарок', cake: 'День рождения', plane: 'Путешествие',
  sun: 'Солнце', moon: 'Луна', cafe: 'Кофе', restaurant: 'Ужин', film: 'Кино',
  music: 'Музыка', camera: 'Фотография', flower: 'Цветы', home: 'Дом', fitness: 'Спорт',
};
