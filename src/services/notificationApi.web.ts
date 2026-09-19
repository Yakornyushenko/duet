import {
  NotificationPermissionSnapshot,
  NotificationResponseSubscription,
  ReminderNotificationInput,
} from '@/services/notificationApi.types';

export const reminderNotificationsAvailable = false;

export async function getNotificationPermission(): Promise<NotificationPermissionSnapshot> {
  return { granted: false, canAskAgain: false };
}

export async function requestNotificationPermission(): Promise<NotificationPermissionSnapshot> {
  return { granted: false, canAskAgain: false };
}

export async function configureReminderChannel(): Promise<void> {}

export async function getScheduledNotificationIds(): Promise<string[]> {
  return [];
}

export async function cancelScheduledNotification(_identifier: string): Promise<void> {}

export async function scheduleReminderNotification(_input: ReminderNotificationInput): Promise<void> {}

export async function openNotificationSettings(): Promise<void> {}

export async function getLastNotificationResponseEventId(): Promise<string | null> {
  return null;
}

export function addNotificationResponseListener(
  _listener: (eventId: string) => void,
): NotificationResponseSubscription {
  return { remove: () => undefined };
}
