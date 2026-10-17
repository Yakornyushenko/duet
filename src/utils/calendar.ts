import { DateEvent } from '@/types/domain';
import { parseDateOnly, toDateOnly } from '@/utils/dates';

export type CalendarDay = {
  date: Date;
  dateKey: string;
  inCurrentMonth: boolean;
};

export function getCalendarMonthDays(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1, 12);
  const leadingDays = (firstDay.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, month, index - leadingDays + 1, 12);
    return {
      date,
      dateKey: toDateOnly(date),
      inCurrentMonth: date.getMonth() === month,
    };
  });
}

export function eventOccursOnDate(event: DateEvent, date: Date): boolean {
  const original = parseDateOnly(event.eventDate);
  if (event.recurrence === 'yearly') {
    return original.getMonth() === date.getMonth() && original.getDate() === date.getDate();
  }
  return event.eventDate === toDateOnly(date);
}
