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

export type DateCategory = typeof dateCategories[number]['value'];

export type DateEventIcon = 'heart' | 'sparkles' | 'gift' | 'cake' | 'plane';

export type DateEvent = {
  id: string;
  title: string;
  eventDate: string;
  recurrence: DateRecurrence;
  category: DateCategory;
  icon: DateEventIcon;
};

export type DateEventInput = Omit<DateEvent, 'id'>;
