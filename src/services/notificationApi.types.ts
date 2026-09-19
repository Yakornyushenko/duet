export type NotificationPermissionSnapshot = {
  granted: boolean;
  canAskAgain: boolean;
};

export type ReminderNotificationInput = {
  identifier: string;
  title: string;
  body: string;
  eventId: string;
  date: Date;
  recurring: boolean;
};

export type NotificationResponseSubscription = {
  remove: () => void;
};
