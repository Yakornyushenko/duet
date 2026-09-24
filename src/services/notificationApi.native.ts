import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

import {
  NotificationOpenTarget,
  NotificationPermissionSnapshot,
  NotificationResponseSubscription,
  ReminderNotificationInput,
} from '@/services/notificationApi.types';

const channelId = 'date-reminders';
const wishChannelId = 'wish-updates';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function isPermissionGranted(permissions: Notifications.NotificationPermissionsStatus): boolean {
  if (permissions.granted) {
    return true;
  }

  const iosStatus = permissions.ios?.status;
  return iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED
    || iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL
    || iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL;
}

function getOpenTarget(data: Record<string, unknown> | undefined): NotificationOpenTarget | null {
  if (!data) {
    return null;
  }
  if (typeof data.wishId === 'string') {
    return { type: 'wish', id: data.wishId };
  }
  if (typeof data.eventId === 'string') {
    return { type: 'event', id: data.eventId };
  }
  return null;
}

export const reminderNotificationsAvailable = true;

export async function getNotificationPermission(): Promise<NotificationPermissionSnapshot> {
  const permissions = await Notifications.getPermissionsAsync();
  return {
    granted: isPermissionGranted(permissions),
    canAskAgain: permissions.canAskAgain,
  };
}

export async function requestNotificationPermission(): Promise<NotificationPermissionSnapshot> {
  const permissions = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return {
    granted: isPermissionGranted(permissions),
    canAskAgain: permissions.canAskAgain,
  };
}

export async function configureReminderChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync(channelId, {
    name: 'Важные даты',
    description: 'Напоминания о важных датах вашей пары',
    importance: Notifications.AndroidImportance.HIGH,
    enableVibrate: true,
    vibrationPattern: [0, 250, 180, 250],
    sound: 'default',
    lightColor: '#E85D75',
  });
}

export async function configureWishChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync(wishChannelId, {
    name: 'Желания',
    description: 'Уведомления о новых и изменённых желаниях партнёра',
    importance: Notifications.AndroidImportance.HIGH,
    enableVibrate: true,
    vibrationPattern: [0, 250, 180, 250],
    sound: 'default',
    lightColor: '#E85D75',
  });
}

export async function getScheduledNotificationIds(): Promise<string[]> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.map((notification) => notification.identifier);
}

export async function cancelScheduledNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function scheduleReminderNotification(input: ReminderNotificationInput): Promise<void> {
  const trigger: Notifications.NotificationTriggerInput = input.recurring
    ? {
        type: Notifications.SchedulableTriggerInputTypes.YEARLY,
        month: input.date.getMonth(),
        day: input.date.getDate(),
        hour: input.date.getHours(),
        minute: input.date.getMinutes(),
        channelId,
      }
    : {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: input.date,
        channelId,
      };

  await Notifications.scheduleNotificationAsync({
    identifier: input.identifier,
    content: {
      title: input.title,
      body: input.body,
      sound: 'default',
      color: '#E85D75',
      vibrate: [0, 250, 180, 250],
      data: { eventId: input.eventId },
    },
    trigger,
  });
}

export async function openNotificationSettings(): Promise<void> {
  if (Platform.OS !== 'android') {
    await Linking.openSettings();
    return;
  }

  const packageName = Constants.expoConfig?.android?.package;
  if (!packageName) {
    await Linking.openSettings();
    return;
  }

  try {
    await configureReminderChannel();
    await Linking.sendIntent('android.settings.CHANNEL_NOTIFICATION_SETTINGS', [
      { key: 'android.provider.extra.APP_PACKAGE', value: packageName },
      { key: 'android.provider.extra.CHANNEL_ID', value: channelId },
    ]);
  } catch {
    await Linking.openSettings();
  }
}

export async function getLastNotificationResponseTarget(): Promise<NotificationOpenTarget | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  const target = getOpenTarget(response?.notification.request.content.data as Record<string, unknown> | undefined);
  if (response) {
    await Notifications.clearLastNotificationResponseAsync();
  }
  return target;
}

/** @deprecated Prefer getLastNotificationResponseTarget */
export async function getLastNotificationResponseEventId(): Promise<string | null> {
  const target = await getLastNotificationResponseTarget();
  return target?.type === 'event' ? target.id : null;
}

export function addNotificationResponseListener(
  listener: (target: NotificationOpenTarget) => void,
): NotificationResponseSubscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const target = getOpenTarget(response.notification.request.content.data as Record<string, unknown> | undefined);
    if (target) {
      listener(target);
    }
  });
}

function getEasProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string }; projectId?: string }
    | undefined;
  return Constants.easConfig?.projectId
    ?? extra?.eas?.projectId
    ?? extra?.projectId
    ?? undefined;
}

export async function getExpoPushToken(devicePushToken?: Notifications.DevicePushToken): Promise<string | null> {
  const projectId = getEasProjectId();
  try {
    const token = await Notifications.getExpoPushTokenAsync(
      { ...(projectId ? { projectId } : {}), ...(devicePushToken ? { devicePushToken } : {}) },
    );
    return token.data;
  } catch (error) {
    // Android native builds need FCM (google-services.json + EAS credentials).
    // Local date reminders still work without a push token.
    console.warn(
      'Push-токен недоступен: для Android нужен FCM, для iOS — APNs.',
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export function addPushTokenListener(
  listener: (token: string) => void,
): NotificationResponseSubscription {
  let active = true;
  let lastNativeToken: string | undefined;
  const subscription = Notifications.addPushTokenListener((devicePushToken) => {
    const key = JSON.stringify(devicePushToken);
    if (!active || key === lastNativeToken) return;
    lastNativeToken = key;
    // Android emits a token event even when reading the existing native token.
    // Reuse the event payload: fetching it again here creates an infinite loop.
    void getExpoPushToken(devicePushToken).then((token) => {
      if (active && token) {
        listener(token);
      } else if (!token && lastNativeToken === key) {
        lastNativeToken = undefined;
      }
    });
  });
  return {
    remove: () => {
      active = false;
      subscription.remove();
    },
  };
}
