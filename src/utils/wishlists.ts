import { AppUser, Couple } from '@/types/domain';

const wishlists = [
  { value: 'together', label: 'Вместе', icon: 'heart-outline' },
  { value: 'creator', label: '', icon: 'person-outline' },
  { value: 'partner', label: '', icon: 'person-outline' },
] as const;
export type Wishlist = typeof wishlists[number]['value'];

export function getWishlists(user: AppUser | null, couple: Couple | null) {
  const isCreator = user?.id === couple?.createdBy;
  return wishlists.map((list) => ({
    ...list,
    label: list.value === 'together' ? list.label
      : (list.value === 'creator') === isCreator ? user?.displayName ?? 'Мой список'
        : couple?.partnerName ?? 'Партнёр',
  }));
}
