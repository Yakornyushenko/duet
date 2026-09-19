import {
  NotificationPermissionSnapshot,
  NotificationResponseSubscription,
  ReminderNotificationInput,
} from '@/services/notificationApi.types';

export const reminderNotificationsAvailable: boolean;
export function getNotificationPermission(): Promise<NotificationPermissionSnapshot>;
export function requestNotificationPermission(): Promise<NotificationPermissionSnapshot>;
export function configureReminderChannel(): Promise<void>;
export function getScheduledNotificationIds(): Promise<string[]>;
export function cancelScheduledNotification(identifier: string): Promise<void>;
export function scheduleReminderNotification(input: ReminderNotificationInput): Promise<void>;
export function openNotificationSettings(): Promise<void>;
export function getLastNotificationResponseEventId(): Promise<string | null>;
export function addNotificationResponseListener(
  listener: (eventId: string) => void,
): NotificationResponseSubscription;
