export type AppUser = {
  id: string;
  email: string;
  displayName: string;
};

export type Couple = {
  id: string;
  relationshipStartedAt: string;
  inviteCode: string | null;
  inviteExpiresAt: string | null;
  partnerName: string | null;
};

export type DateRecurrence = 'none' | 'yearly';

export type DateEventIcon = 'heart' | 'sparkles' | 'gift' | 'cake' | 'plane';

export type DateEvent = {
  id: string;
  title: string;
  eventDate: string;
  recurrence: DateRecurrence;
  icon: DateEventIcon;
};

export type DateEventInput = Omit<DateEvent, 'id'>;
