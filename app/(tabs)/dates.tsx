import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DateCategoryPicker } from '@/components/DateCategoryPicker';
import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { DateCard } from '@/components/DateCard';
import { useApp } from '@/context/AppContext';
import { useReminders } from '@/context/ReminderContext';
import { getPlannedReminderLabel } from '@/services/reminders';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { DateCategory } from '@/types/domain';
import { getUpcomingEvents, sortByNextOccurrence } from '@/utils/dates';

export default function DatesScreen() {
  const { events, categories } = useApp();
  const { plannedReminders } = useReminders();
  const [category, setCategory] = useState<DateCategory | 'all'>('all');
  useEffect(() => {
    if (category !== 'all' && !categories.some((item) => item.value === category)) setCategory('all');
  }, [categories, category]);
  const filteredEvents = category === 'all' ? events : events.filter((event) => event.category === category);
  const upcoming = getUpcomingEvents(filteredEvents);
  const upcomingIds = new Set(upcoming.map((event) => event.id));
  const past = sortByNextOccurrence(filteredEvents.filter((event) => !upcomingIds.has(event.id)));

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>Наши даты</Text>
          <Text style={styles.subtitle}>{events.length ? `${events.length} в вашем календаре` : 'Ваш общий календарь'}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Добавить дату"
          onPress={() => router.push({ pathname: '/date-form', params: { category } })}
          style={styles.addButton}
        >
          <Ionicons name="add" size={26} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.filters}>
        <DateCategoryPicker value={category} onChange={setCategory} includeAll />
      </View>

      {filteredEvents.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-outline" size={34} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>{category === 'all' ? 'Здесь появятся ваши даты' : 'В этой категории пока нет дат'}</Text>
          <Text style={styles.emptyText}>Добавьте годовщину, дни рождения и будущие совместные планы.</Text>
          <AppButton label="Добавить дату" onPress={() => router.push({ pathname: '/date-form', params: { category } })} />
        </View>
      ) : (
        <>
          {upcoming.length ? <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ближайшие</Text>
            <View style={styles.list}>
              {upcoming.map((event) => (
                <DateCard
                  key={event.id}
                  event={event}
                  reminderLabel={getPlannedReminderLabel(plannedReminders, event.id)}
                  onPress={() => router.push({ pathname: '/date-form', params: { id: event.id } })}
                />
              ))}
            </View>
          </View> : null}
          {past.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Прошедшие</Text>
              <View style={styles.list}>
                {past.map((event) => (
                  <DateCard
                    key={event.id}
                    event={event}
                    reminderLabel={getPlannedReminderLabel(plannedReminders, event.id)}
                    onPress={() => router.push({ pathname: '/date-form', params: { id: event.id } })}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  filter: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.softRose,
  },
  filterSelected: { backgroundColor: colors.primary },
  filterText: { ...typography.label, color: colors.primary },
  filterTextSelected: { color: colors.white },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  headingCopy: {
    gap: spacing.xs,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.muted,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  section: {
    gap: spacing.md,
    marginBottom: spacing.xxxl,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  list: {
    gap: spacing.md,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.huge,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.softRose,
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
    maxWidth: 320,
  },
});
