import {
  cancelScheduledNotification,
  configureReminderChannel,
  getNotificationPermission,
  getScheduledNotificationIds,
  openNotificationSettings,
  reminderNotificationsAvailable,
  requestNotificationPermission,
  scheduleReminderNotification,
} from '@/services/notificationApi';
import { DateEvent } from '@/types/domain';
import { getNextOccurrence } from '@/utils/dates';

export const reminderOffsets = [7, 1, 0] as const;
export type ReminderOffset = (typeof reminderOffsets)[number];

export type EventReminderSettings = {
  notifications?: { date: string; time: string; text?: string }[];
  enabled: boolean;
  offsets: ReminderOffset[];
  time: string;
};

export type ReminderPreferences = {
  enabled: boolean;
  defaultTime: string;
  events: Record<string, EventReminderSettings>;
};

export type PlannedReminder = {
  text?: string;
  event: DateEvent;
  offset: number;
  recurring?: boolean;
  date: Date;
};

export type PlannedEventReminders = {
  event: DateEvent;
  reminders: PlannedReminder[];
};

export type ReminderPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

const notificationIdPrefix = 'duet-reminder:';

export const defaultReminderPreferences: ReminderPreferences = {
  enabled: false,
  defaultTime: '10:00',
  events: {},
};

function getReminderDate(event: DateEvent, offset: ReminderOffset, time: string, now = new Date()): Date | null {
  const [hour, minute] = time.split(':').map(Number);
  const occurrence = getNextOccurrence(event, now);
  const reminderDate = new Date(occurrence);
  reminderDate.setDate(reminderDate.getDate() - offset);
  reminderDate.setHours(hour, minute, 0, 0);

  if (reminderDate > now) {
    return reminderDate;
  }
  if (event.recurrence === 'none') {
    return null;
  }

  occurrence.setFullYear(occurrence.getFullYear() + 1);
  reminderDate.setTime(occurrence.getTime());
  reminderDate.setDate(reminderDate.getDate() - offset);
  reminderDate.setHours(hour, minute, 0, 0);
  return reminderDate;
}

function getNotificationTitle(offset: number): string {
  if (offset === 0) {
    return 'Сегодня важная дата';
  }
  if (offset === 1) {
    return 'Уже завтра';
  }
  return `Через ${offset} дней важная дата`;
}

export function getEventReminderSettings(
  preferences: ReminderPreferences,
  eventId?: string,
): EventReminderSettings {
  if (eventId && preferences.events[eventId]) {
    return preferences.events[eventId];
  }
  return {
    enabled: false,
    offsets: [7, 0],
    time: preferences.defaultTime,
  };
}

export function normalizeReminderPreferences(value: unknown): ReminderPreferences {
  if (!value || typeof value !== 'object') {
    return defaultReminderPreferences;
  }

  const stored = value as Partial<ReminderPreferences>;
  const defaultTime = typeof stored.defaultTime === 'string'
    && /^([01]\d|2[0-3]):[0-5]\d$/.test(stored.defaultTime)
    ? stored.defaultTime
    : defaultReminderPreferences.defaultTime;
  const events = stored.events && typeof stored.events === 'object'
    ? Object.entries(stored.events).reduce<Record<string, EventReminderSettings>>((result, [eventId, setting]) => {
        if (!setting || typeof setting !== 'object') {
          return result;
        }
        const candidate = setting as Partial<EventReminderSettings>;
        const offsets = Array.isArray(candidate.offsets)
          ? [...new Set(candidate.offsets.filter((offset): offset is ReminderOffset => (
              typeof offset === 'number' && reminderOffsets.includes(offset as ReminderOffset)
            )))]
          : [7 as const, 0 as const];
        result[eventId] = {
          ...(Array.isArray(candidate.notifications) ? {
            notifications: candidate.notifications.filter((item) => item
              && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
              && /^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)).slice(0, 4),
          } : {}),
          enabled: candidate.enabled === true,
          offsets,
          time: typeof candidate.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(candidate.time)
            ? candidate.time
            : defaultTime,
        };
        return result;
      }, {})
    : {};
  return {
    enabled: stored.enabled === true,
    defaultTime,
    events,
  };
}

export async function getReminderPermissionStatus(): Promise<ReminderPermissionStatus> {
  if (!reminderNotificationsAvailable) {
    return 'unavailable';
  }

  const permissions = await getNotificationPermission();
  if (permissions.granted) {
    return 'granted';
  }
  return permissions.canAskAgain ? 'undetermined' : 'denied';
}

export async function requestReminderPermission(): Promise<boolean> {
  if (!reminderNotificationsAvailable) {
    return false;
  }

  await configureReminderChannel();
  const current = await getNotificationPermission();
  if (current.granted) {
    return true;
  }

  const requested = await requestNotificationPermission();
  return requested.granted;
}

export async function openReminderNotificationSettings(): Promise<void> {
  await openNotificationSettings();
}

export function getPlannedReminders(
  events: DateEvent[],
  preferences: ReminderPreferences,
  now = new Date(),
): PlannedReminder[] {
  if (!preferences.enabled) {
    return [];
  }

  return events
    .flatMap<PlannedReminder>((event) => {
      const settings = getEventReminderSettings(preferences, event.id);
      if (!settings.enabled) {
        return [];
      }
      if (settings.notifications) {
        const occurrence = getNextOccurrence(event, now);
        const deadline = new Date(occurrence);
        deadline.setHours(23, 59, 59, 999);
        const seen = new Set<number>();
        return settings.notifications.slice(0, 4).flatMap((item) => {
          const date = new Date(`${item.date}T${item.time}:00`);
          if (!(date > now && date <= deadline) || seen.has(date.getTime())) return [];
          seen.add(date.getTime());
          const offset = Math.round((Date.UTC(occurrence.getFullYear(), occurrence.getMonth(), occurrence.getDate())
            - Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) / 86400000);
          return [{ event, offset, date, recurring: false, text: typeof item.text === 'string' ? item.text.trim().slice(0, 200) : '' }];
        });
      }
      return settings.offsets.flatMap((offset) => {
        const date = getReminderDate(event, offset, settings.time, now);
        return date ? [{ event, offset, date }] : [];
      });
    })
    .sort((left, right) => left.date.getTime() - right.date.getTime());
}

export function groupPlannedRemindersByEvent(
  reminders: PlannedReminder[],
): PlannedEventReminders[] {
  const groups = new Map<string, PlannedEventReminders>();
  reminders.forEach((reminder) => {
    const group = groups.get(reminder.event.id);
    if (group) {
      group.reminders.push(reminder);
    } else {
      groups.set(reminder.event.id, {
        event: reminder.event,
        reminders: [reminder],
      });
    }
  });
  return [...groups.values()];
}

export function formatReminderCount(value: number): string {
  const lastTwoDigits = value % 100;
  const lastDigit = value % 10;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${value} напоминаний`;
  }
  if (lastDigit === 1) {
    return `${value} напоминание`;
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${value} напоминания`;
  }
  return `${value} напоминаний`;
}

export function getPlannedReminderLabel(
  reminders: PlannedReminder[],
  eventId: string,
): string | undefined {
  const count = reminders.filter((reminder) => reminder.event.id === eventId).length;
  return count ? formatReminderCount(count) : undefined;
}

export async function syncScheduledReminders(
  events: DateEvent[],
  preferences: ReminderPreferences,
): Promise<void> {
  if (!reminderNotificationsAvailable) {
    return;
  }

  const scheduled = await getScheduledNotificationIds();
  await Promise.all(
    scheduled
      .filter((identifier) => identifier.startsWith(notificationIdPrefix))
      .map(cancelScheduledNotification),
  );

  if (!preferences.enabled || await getReminderPermissionStatus() !== 'granted') {
    return;
  }

  await configureReminderChannel();
  const planned = getPlannedReminders(events, preferences);

  await Promise.all(planned.map(({ event, offset, date, recurring, text }) => (
    scheduleReminderNotification({
      identifier: `${notificationIdPrefix}${event.id}:${date.getTime()}`,
      title: getNotificationTitle(offset),
      body: text || event.title,
      eventId: event.id,
      date,
      recurring: recurring ?? event.recurrence === 'yearly',
    })
  )));
}
