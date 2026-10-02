import { AppUser, Couple } from '@/types/domain';

const wishlists = [
  { value: 'together', label: 'Вместе', icon: 'heart-outline' },
  { value: 'creator', label: '', icon: 'person-outline' },
  { value: 'partner', label: '', icon: 'person-outline' },
] as const;
export type Wishlist = typeof wishlists[number]['value'];

export function getWishlists(user: AppUser | null, couple: Couple | null) {
  const isCreator = user?.id === couple?.createdBy;
  return wishlists.filter((list) => couple?.partnerName || list.value === 'together'
    || (list.value === 'creator') === isCreator).map((list) => ({
    ...list,
    label: list.value === 'together' ? list.label
      : (list.value === 'creator') === isCreator ? (couple?.partnerName ? user?.displayName ?? 'Мои' : 'Мои')
        : couple?.partnerName ?? 'Партнёр',
  }));
}
