import {
  NotificationOpenTarget,
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

export async function configureWishChannel(): Promise<void> {}

export async function getScheduledNotificationIds(): Promise<string[]> {
  return [];
}

export async function cancelScheduledNotification(_identifier: string): Promise<void> {}

export async function scheduleReminderNotification(_input: ReminderNotificationInput): Promise<void> {}

export async function openNotificationSettings(): Promise<void> {}

export async function getLastNotificationResponseTarget(): Promise<NotificationOpenTarget | null> {
  return null;
}

export async function getLastNotificationResponseEventId(): Promise<string | null> {
  return null;
}

export function addNotificationResponseListener(
  _listener: (target: NotificationOpenTarget) => void,
): NotificationResponseSubscription {
  return { remove: () => undefined };
}

export async function getExpoPushToken(): Promise<string | null> {
  return null;
}

export function addPushTokenListener(
  _listener: (token: string) => void,
): NotificationResponseSubscription {
  return { remove: () => undefined };
}
