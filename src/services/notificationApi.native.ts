import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

import {
  NotificationPermissionSnapshot,
  NotificationResponseSubscription,
  ReminderNotificationInput,
} from '@/services/notificationApi.types';

const channelId = 'date-reminders';

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

export async function getLastNotificationResponseEventId(): Promise<string | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  const eventId = response?.notification.request.content.data.eventId;
  if (response) {
    await Notifications.clearLastNotificationResponseAsync();
  }
  return typeof eventId === 'string' ? eventId : null;
}

export function addNotificationResponseListener(
  listener: (eventId: string) => void,
): NotificationResponseSubscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const eventId = response.notification.request.content.data.eventId;
    if (typeof eventId === 'string') {
      listener(eventId);
    }
  });
}
