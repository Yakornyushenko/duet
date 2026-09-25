export type AppUser = {
  id: string;
  email: string;
  displayName: string;
};

export type Couple = {
  createdBy: string;
  id: string;
  relationshipStartedAt: string;
  inviteCode: string | null;
  inviteExpiresAt: string | null;
  partnerName: string | null;
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

export type DateEventIcon = 'heart' | 'sparkles' | 'gift' | 'cake' | 'plane'
  | 'sun' | 'moon' | 'cafe' | 'restaurant' | 'film'
  | 'music' | 'camera' | 'flower' | 'home' | 'fitness';

export type DateEvent = {
  id: string;
  title: string;
  eventDate: string;
  recurrence: DateRecurrence;
  category: DateCategory;
  icon: DateEventIcon;
};

export type DateEventInput = Omit<DateEvent, 'id'>;
