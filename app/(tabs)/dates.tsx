import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { DateCard } from '@/components/DateCard';
import { useApp } from '@/context/AppContext';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { getUpcomingEvents, sortByNextOccurrence } from '@/utils/dates';

export default function DatesScreen() {
  const { events } = useApp();
  const upcoming = getUpcomingEvents(events);
  const past = sortByNextOccurrence(events.filter((event) => !upcoming.some((item) => item.id === event.id)));

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>Важные даты</Text>
          <Text style={styles.subtitle}>{events.length ? `${events.length} в вашем календаре` : 'Ваш общий календарь'}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Добавить дату"
          onPress={() => router.push('/date-form')}
          style={styles.addButton}
        >
          <Ionicons name="add" size={26} color={colors.white} />
        </Pressable>
      </View>

      {events.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-outline" size={34} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Здесь появятся ваши даты</Text>
          <Text style={styles.emptyText}>Добавьте годовщину, дни рождения и будущие совместные планы.</Text>
          <AppButton label="Добавить первую дату" onPress={() => router.push('/date-form')} />
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ближайшие</Text>
            <View style={styles.list}>
              {upcoming.map((event) => (
                <DateCard
                  key={event.id}
                  event={event}
                  onPress={() => router.push({ pathname: '/date-form', params: { id: event.id } })}
                />
              ))}
            </View>
          </View>
          {past.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Прошедшие</Text>
              <View style={styles.list}>
                {past.map((event) => (
                  <DateCard
                    key={event.id}
                    event={event}
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
