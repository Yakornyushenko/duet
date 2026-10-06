import { DateEvent } from '@/types/domain';

const dayInMilliseconds = 86_400_000;

function getUtcDayNumber(value: Date): number {
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
}

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

export function toDateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDaysTogether(startDate: string, now = new Date()): number {
  const start = parseDateOnly(startDate);
  const today = parseDateOnly(toDateOnly(now));
  return Math.max(1, Math.floor((getUtcDayNumber(today) - getUtcDayNumber(start)) / dayInMilliseconds));
}

export function getNextOccurrence(event: DateEvent, now = new Date()): Date {
  const original = parseDateOnly(event.eventDate);
  if (event.recurrence === 'none') {
    return original;
  }

  const today = parseDateOnly(toDateOnly(now));
  const occurrence = new Date(today.getFullYear(), original.getMonth(), original.getDate(), 12);
  if (occurrence < today) {
    occurrence.setFullYear(occurrence.getFullYear() + 1);
  }
  return occurrence;
}

export function getDaysUntil(event: DateEvent, now = new Date()): number {
  const today = parseDateOnly(toDateOnly(now));
  return Math.ceil((getUtcDayNumber(getNextOccurrence(event, now)) - getUtcDayNumber(today)) / dayInMilliseconds);
}

export function sortByNextOccurrence(events: DateEvent[], now = new Date()): DateEvent[] {
  return [...events].sort(
    (left, right) => getNextOccurrence(left, now).getTime() - getNextOccurrence(right, now).getTime(),
  );
}

export function getUpcomingEvents(events: DateEvent[], now = new Date()): DateEvent[] {
  const today = parseDateOnly(toDateOnly(now));
  return sortByNextOccurrence(
    events.filter((event) => event.recurrence === 'yearly' || getNextOccurrence(event, now) >= today),
    now,
  );
}

export function formatEventDate(event: DateEvent, now = new Date()): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(event.recurrence === 'none' ? { year: 'numeric' as const } : {}),
  }).format(event.recurrence === 'none' ? parseDateOnly(event.eventDate) : getNextOccurrence(event, now));
}

export function formatRelationshipDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseDateOnly(value));
}

export function pluralizeDays(value: number): string {
  const lastTwoDigits = value % 100;
  const lastDigit = value % 10;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return 'дней';
  }
  if (lastDigit === 1) {
    return 'день';
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'дня';
  }
  return 'дней';
}
