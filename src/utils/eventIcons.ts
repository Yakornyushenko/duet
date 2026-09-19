import { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { DateEventIcon } from '@/types/domain';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export const eventIcons: Record<DateEventIcon, IoniconName> = {
  heart: 'heart-outline',
  sparkles: 'sparkles-outline',
  gift: 'gift-outline',
  cake: 'calendar-outline',
  plane: 'airplane-outline',
};
