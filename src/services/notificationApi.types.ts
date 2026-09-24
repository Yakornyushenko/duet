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

export type NotificationOpenTarget =
  | { type: 'event'; id: string }
  | { type: 'wish'; id: string };

export type NotificationResponseSubscription = {
  remove: () => void;
};
