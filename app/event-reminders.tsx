import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { useApp } from '@/context/AppContext';
import { useReminders } from '@/context/ReminderContext';
import { formatReminderCount } from '@/services/reminders';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { formatEventDate } from '@/utils/dates';
import { eventIcons } from '@/utils/eventIcons';

function getOffsetLabel(offset: number): string {
  if (offset === 0) {
    return 'В день события';
  }
  if (offset === 1) {
    return 'За день до события';
  }
  return `За ${offset} дней до события`;
}

function formatReminderDate(date: Date): string {
  const day = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  }).format(date);
  const time = new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  return `${day}, ${time}`;
}

export default function EventRemindersScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { events } = useApp();
  const { plannedReminders } = useReminders();
  const event = events.find((item) => item.id === eventId);
  const eventReminders = plannedReminders.filter((reminder) => reminder.event.id === eventId);

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Назад"
          onPress={() => router.back()}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Напоминания</Text>
        <View style={styles.headerSpacer} />
      </View>

      {event ? (
        <>
          <View style={styles.eventCard}>
            <View style={styles.eventIcon}>
              <Ionicons name={eventIcons[event.icon]} size={26} color={colors.primary} />
            </View>
            <View style={styles.eventCopy}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventDate}>{formatEventDate(event)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Все уведомления</Text>
              <Text style={styles.count}>{formatReminderCount(eventReminders.length)}</Text>
            </View>
            <View style={styles.list}>
              {eventReminders.map((reminder) => (
                <View key={reminder.date.getTime()} style={styles.reminderCard}>
                  <View style={styles.reminderIcon}>
                    <Ionicons name="notifications-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.reminderCopy}>
                    <Text style={styles.reminderLabel}>{reminder.text || getOffsetLabel(reminder.offset)}</Text>
                    <Text style={styles.reminderDate}>{formatReminderDate(reminder.date)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <AppButton
            label="Изменить уведомления"
            variant="secondary"
            onPress={() => router.push({ pathname: '/date-form', params: { id: event.id } })}
          />
        </>
      ) : (
        <View style={styles.emptyCard}>
          <View style={styles.eventIcon}>
            <Ionicons name="calendar-outline" size={26} color={colors.primary} />
          </View>
          <Text style={styles.eventTitle}>Событие не найдено</Text>
          <AppButton label="Вернуться" onPress={() => router.back()} />
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxxl,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    ...typography.cardTitle,
    color: colors.text,
  },
  headerSpacer: {
    width: 44,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
  },
  eventIcon: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.softRose,
  },
  eventCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  eventTitle: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  eventDate: {
    ...typography.body,
    color: colors.muted,
  },
  section: {
    gap: spacing.md,
    marginTop: spacing.xxxl,
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  count: {
    ...typography.label,
    color: colors.primary,
  },
  list: {
    gap: spacing.md,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  reminderIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.softRose,
  },
  reminderCopy: {
    flex: 1,
    gap: 2,
  },
  reminderLabel: {
    ...typography.cardTitle,
    color: colors.text,
  },
  reminderDate: {
    ...typography.caption,
    color: colors.muted,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.xl,
    padding: spacing.xxl,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
  },
});
