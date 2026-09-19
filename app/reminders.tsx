import { Ionicons } from '@expo/vector-icons';
import { Href, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { useDialog } from '@/context/DialogContext';
import { useReminders } from '@/context/ReminderContext';
import {
  formatReminderCount,
  groupPlannedRemindersByEvent,
  PlannedEventReminders,
} from '@/services/reminders';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { formatEventDate } from '@/utils/dates';
import { eventIcons } from '@/utils/eventIcons';

function EventReminderCard({ group }: { group: PlannedEventReminders }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Открыть напоминания события: ${group.event.title}`}
      onPress={() => router.push(`/event-reminders?id=${encodeURIComponent(group.event.id)}` as Href)}
      style={({ pressed }) => [styles.reminderCard, pressed && styles.pressed]}
    >
      <View style={styles.eventIcon}>
        <Ionicons name={eventIcons[group.event.icon]} size={21} color={colors.primary} />
      </View>
      <View style={styles.reminderCopy}>
        <Text style={styles.reminderTitle} numberOfLines={2}>{group.event.title}</Text>
        <Text style={styles.reminderDate}>{formatEventDate(group.event)}</Text>
        <Text style={styles.offset}>{formatReminderCount(group.reminders.length)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>
  );
}

export default function RemindersScreen() {
  const {
    enabled,
    initializing,
    permissionStatus,
    plannedReminders,
    setEnabled,
    openSystemSettings,
  } = useReminders();
  const { showDialog } = useDialog();
  const eventReminderGroups = groupPlannedRemindersByEvent(plannedReminders);

  const enableReminders = async () => {
    const permissionGranted = await setEnabled(true);
    if (!permissionGranted) {
      showDialog({
        title: 'Разрешите уведомления',
        message: 'Включите уведомления для Duet в настройках телефона.',
        tone: 'warning',
        actions: [
          { label: 'Открыть настройки', onPress: openSystemSettings },
          { label: 'Отмена', variant: 'ghost' },
        ],
      });
    }
  };

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

      {!enabled ? (
        <View style={styles.emptyCard}>
          <View style={styles.largeIcon}>
            <Ionicons name="notifications-outline" size={30} color={colors.primary} />
          </View>
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>
              {permissionStatus === 'denied' ? 'Уведомления запрещены' : 'Не пропускайте важные даты'}
            </Text>
            <Text style={styles.emptyText}>
              {permissionStatus === 'denied'
                ? 'Разрешите уведомления для Duet в настройках телефона.'
                : 'Выберите даты и время — Duet напомнит заранее.'}
            </Text>
          </View>
          <AppButton
            label={permissionStatus === 'denied' ? 'Открыть настройки' : 'Включить напоминания'}
            onPress={permissionStatus === 'denied'
              ? () => void openSystemSettings()
              : () => void enableReminders()}
            disabled={initializing}
          />
        </View>
      ) : eventReminderGroups.length ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>События с напоминаниями</Text>
            <Text style={styles.count}>{eventReminderGroups.length}</Text>
          </View>
          <View style={styles.list}>
            {eventReminderGroups.map((group) => (
              <EventReminderCard
                key={group.event.id}
                group={group}
              />
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <View style={styles.largeIcon}>
            <Ionicons name="calendar-outline" size={30} color={colors.primary} />
          </View>
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>Пока ничего не запланировано</Text>
            <Text style={styles.emptyText}>Откройте важную дату и включите для неё напоминание.</Text>
          </View>
          <AppButton label="Выбрать дату" onPress={() => router.push('/(tabs)/dates')} />
        </View>
      )}

      {enabled && plannedReminders.length ? (
        <AppButton label="Настроить даты" variant="secondary" onPress={() => router.push('/(tabs)/dates')} />
      ) : null}
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
  section: {
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  eventIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.softRose,
  },
  reminderCopy: {
    flex: 1,
    gap: 2,
  },
  reminderTitle: {
    ...typography.cardTitle,
    color: colors.text,
  },
  reminderDate: {
    ...typography.caption,
    color: colors.muted,
  },
  offset: {
    ...typography.caption,
    color: colors.primary,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.xl,
    padding: spacing.xxl,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
  },
  largeIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: colors.softRose,
  },
  emptyCopy: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.sectionTitle,
    color: colors.text,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});
