export type AppUser = {
  id: string;
  email: string;
  displayName: string;
  avatarPath: string | null;
  avatarUrl: string | null;
};

export type Couple = {
  createdBy: string;
  id: string;
  relationshipStartedAt: string | null;
  inviteCode: string | null;
  inviteExpiresAt: string | null;
  partnerName: string | null;
  partnerAvatarPath: string | null;
  partnerAvatarUrl: string | null;
};

export type DateRecurrence = 'none' | 'yearly';

export const dateCategories = [
  { value: 'important', label: 'Важные даты' },
  { value: 'travel', label: 'Путешествия' },
  { value: 'dates', label: 'Свидания' },
  { value: 'other', label: 'Разное' },
] as const;

export type DateCategory = string;
export type DateCategoryOption = { value: string; label: string; customSlot: number | null };

export type EntityIcon = 'heart' | 'sparkles' | 'gift' | 'cake' | 'plane'
  | 'sun' | 'moon' | 'cafe' | 'restaurant' | 'film'
  | 'music' | 'camera' | 'flower' | 'home' | 'fitness'
  | 'note' | 'checklist' | 'idea' | 'bookmark' | 'book' | 'cart' | 'flag' | 'chat'
  | 'calendar' | 'balloon' | 'people' | 'wine' | 'time'
  | 'game' | 'headphones' | 'phone' | 'watch' | 'bicycle' | 'car' | 'boat' | 'bag'
  | 'pencil' | 'clipboard' | 'folder' | 'link' | 'attach' | 'list' | 'grid' | 'document' | 'archive';

// The database keeps icons in one enum so older selections remain readable,
// while the UI exposes a dedicated subset for each entity.
export type DateEventIcon = EntityIcon;

export type DateEvent = {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  recurrence: DateRecurrence;
  category: DateCategory;
  icon: DateEventIcon;
};

export type DateEventInput = Omit<DateEvent, 'id'>;
