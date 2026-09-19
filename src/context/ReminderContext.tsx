import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { AppState, Platform } from 'react-native';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useApp } from '@/context/AppContext';
import {
  addNotificationResponseListener,
  getLastNotificationResponseEventId,
} from '@/services/notificationApi';
import {
  defaultReminderPreferences,
  EventReminderSettings,
  getEventReminderSettings,
  getPlannedReminders,
  getReminderPermissionStatus,
  normalizeReminderPreferences,
  openReminderNotificationSettings,
  PlannedReminder,
  ReminderPermissionStatus,
  ReminderPreferences,
  requestReminderPermission,
  syncScheduledReminders,
} from '@/services/reminders';

type ReminderContextValue = {
  initializing: boolean;
  enabled: boolean;
  permissionStatus: ReminderPermissionStatus;
  plannedReminders: PlannedReminder[];
  getEventSettings: (eventId?: string) => EventReminderSettings;
  setEnabled: (enabled: boolean) => Promise<boolean>;
  saveEventSettings: (eventId: string, settings: EventReminderSettings) => Promise<void>;
  removeEventSettings: (eventId: string) => Promise<void>;
  openSystemSettings: () => Promise<void>;
};

const ReminderContext = createContext<ReminderContextValue | null>(null);

function getStorageKey(userId: string): string {
  return `duet:reminders:${userId}`;
}

export function ReminderProvider({ children }: PropsWithChildren) {
  const { user, events } = useApp();
  const [preferences, setPreferences] = useState<ReminderPreferences>(defaultReminderPreferences);
  const preferencesRef = useRef(defaultReminderPreferences);
  const syncQueueRef = useRef(Promise.resolve());
  const [permissionStatus, setPermissionStatus] = useState<ReminderPermissionStatus>('undetermined');
  const [initializing, setInitializing] = useState(true);

  const refreshPermissionStatus = useCallback(async () => {
    const status = await getReminderPermissionStatus();
    setPermissionStatus(status);
    return status;
  }, []);

  useEffect(() => {
    let active = true;

    const loadPreferences = async () => {
      setInitializing(true);
      if (!user) {
        preferencesRef.current = defaultReminderPreferences;
        setPreferences(defaultReminderPreferences);
        setInitializing(false);
        return;
      }

      try {
        const stored = await AsyncStorage.getItem(getStorageKey(user.id));
        if (active) {
          const nextPreferences = normalizeReminderPreferences(stored ? JSON.parse(stored) : null);
          preferencesRef.current = nextPreferences;
          setPreferences(nextPreferences);
          await refreshPermissionStatus();
        }
      } catch (error) {
        console.error('Не удалось загрузить настройки напоминаний', error);
        if (active) {
          preferencesRef.current = defaultReminderPreferences;
          setPreferences(defaultReminderPreferences);
        }
      } finally {
        if (active) {
          setInitializing(false);
        }
      }
    };

    void loadPreferences();
    return () => {
      active = false;
    };
  }, [refreshPermissionStatus, user?.id]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshPermissionStatus();
      }
    });
    return () => subscription.remove();
  }, [refreshPermissionStatus]);

  useEffect(() => {
    if (initializing) {
      return;
    }
    syncQueueRef.current = syncQueueRef.current
      .then(() => syncScheduledReminders(events, preferences))
      .catch((error) => {
        console.error('Не удалось обновить напоминания', error);
      });
  }, [events, initializing, preferences]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    let active = true;
    const subscription = addNotificationResponseListener((eventId) => {
      router.push({ pathname: '/date-form', params: { id: eventId } });
    });
    void getLastNotificationResponseEventId().then((eventId) => {
      if (active && eventId) {
        router.push({ pathname: '/date-form', params: { id: eventId } });
      }
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const storePreferences = useCallback(async (
    update: (current: ReminderPreferences) => ReminderPreferences,
  ) => {
    const nextPreferences = update(preferencesRef.current);
    preferencesRef.current = nextPreferences;
    setPreferences(nextPreferences);
    if (user) {
      await AsyncStorage.setItem(getStorageKey(user.id), JSON.stringify(nextPreferences));
    }
  }, [user]);

  const value = useMemo<ReminderContextValue>(() => ({
    initializing,
    enabled: preferences.enabled && permissionStatus === 'granted',
    permissionStatus,
    plannedReminders: getPlannedReminders(events, preferences),
    getEventSettings: (eventId) => getEventReminderSettings(preferences, eventId),
    setEnabled: async (enabled) => {
      if (enabled) {
        const granted = await requestReminderPermission();
        setPermissionStatus(granted ? 'granted' : 'denied');
        if (!granted) {
          return false;
        }
      }
      await storePreferences((current) => ({ ...current, enabled }));
      return true;
    },
    saveEventSettings: async (eventId, settings) => {
      await storePreferences((current) => ({
        ...current,
        events: { ...current.events, [eventId]: settings },
      }));
    },
    removeEventSettings: async (eventId) => {
      await storePreferences((current) => {
        const nextEvents = { ...current.events };
        delete nextEvents[eventId];
        return { ...current, events: nextEvents };
      });
    },
    openSystemSettings: openReminderNotificationSettings,
  }), [events, initializing, permissionStatus, preferences, storePreferences]);

  return <ReminderContext.Provider value={value}>{children}</ReminderContext.Provider>;
}

export function useReminders() {
  const context = useContext(ReminderContext);
  if (!context) {
    throw new Error('useReminders должен использоваться внутри ReminderProvider');
  }
  return context;
}
