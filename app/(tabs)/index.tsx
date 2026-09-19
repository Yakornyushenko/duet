import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { DateCard } from '@/components/DateCard';
import { PairAvatars } from '@/components/PairAvatars';
import { RelationshipDateEditor } from '@/components/RelationshipDateEditor';
import { useApp } from '@/context/AppContext';
import { useReminders } from '@/context/ReminderContext';
import { getPlannedReminderLabel } from '@/services/reminders';
import { colors, radii, shadow, spacing, typography } from '@/theme/tokens';
import { formatRelationshipDate, getDaysTogether, getUpcomingEvents } from '@/utils/dates';

export default function HomeScreen() {
  const { user, couple, events } = useApp();
  const { plannedReminders } = useReminders();
  const [relationshipDateEditorVisible, setRelationshipDateEditorVisible] = useState(false);
  const upcomingEvents = getUpcomingEvents(events);
  const nextEvent = upcomingEvents[0];
  const otherEvents = upcomingEvents.slice(1, 3);

  if (!user || !couple) {
    return null;
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.coupleIdentity}>
          <PairAvatars firstName={user.displayName} secondName={couple.partnerName} />
          <View>
            <Text style={styles.eyebrow}>Наше пространство</Text>
            <Text style={styles.coupleName}>{user.displayName} + {couple.partnerName}</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Уведомления"
          onPress={() => router.push('/reminders')}
          style={styles.iconButton}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.secondary} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Мы вместе уже</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Изменить дату начала отношений"
          onPress={() => setRelationshipDateEditorVisible(true)}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.dayCount}>{getDaysTogether(couple.relationshipStartedAt)}</Text>
          <Text style={styles.dayLabel}>дней</Text>
        </Pressable>
        <Text style={styles.heroDate}>С {formatRelationshipDate(couple.relationshipStartedAt)}</Text>
      </View>

      <RelationshipDateEditor
        visible={relationshipDateEditorVisible}
        onClose={() => setRelationshipDateEditorVisible(false)}
      />

      {nextEvent ? (
        <DateCard
          event={nextEvent}
          highlighted
          onPress={() => router.push({ pathname: '/date-form', params: { id: nextEvent.id } })}
        />
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={28} color={colors.primary} />
          <View style={styles.emptyCopy}>
            <Text style={styles.cardTitle}>Добавьте вашу первую дату</Text>
            <Text style={styles.muted}>Годовщина, поездка или любой важный для вас день.</Text>
          </View>
          <AppButton label="Добавить дату" onPress={() => router.push('/date-form')} />
        </View>
      )}

      {otherEvents.length ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ближайшие</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/dates')}>
              <Text style={styles.link}>Все даты</Text>
            </Pressable>
          </View>
          <View style={styles.eventList}>
            {otherEvents.map((event) => (
              <DateCard
                key={event.id}
                event={event}
                reminderLabel={getPlannedReminderLabel(plannedReminders, event.id)}
                onPress={() => router.push({ pathname: '/date-form', params: { id: event.id } })}
              />
            ))}
          </View>
        </View>
      ) : nextEvent ? (
        <AppButton label="Добавить ещё одну дату" variant="secondary" onPress={() => router.push('/date-form')} />
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
  coupleIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexShrink: 1,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.muted,
  },
  coupleName: {
    ...typography.cardTitle,
    color: colors.text,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.softRose,
  },
  hero: {
    marginBottom: spacing.xxxl,
  },
  dayCount: {
    fontSize: 68,
    lineHeight: 74,
    letterSpacing: -3,
    fontWeight: '700',
    color: colors.text,
  },
  dayLabel: {
    ...typography.sectionTitle,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  heroDate: {
    ...typography.body,
    color: colors.muted,
  },
  section: {
    gap: spacing.md,
    marginTop: spacing.xxxl,
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
  link: {
    ...typography.label,
    color: colors.primary,
  },
  eventList: {
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.68,
  },
  emptyCard: {
    ...shadow,
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xxl,
  },
  emptyCopy: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardTitle: {
    ...typography.cardTitle,
    color: colors.text,
    textAlign: 'center',
  },
  muted: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
  },
});
