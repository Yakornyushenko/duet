import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

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
  const otherEvents = upcomingEvents.slice(1);

  if (!user || !couple) {
    return null;
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.coupleIdentity}>
          <PairAvatars firstName={user.displayName} secondName={couple.partnerName} />
          <View style={styles.identityCopy}>
            <Text style={styles.eyebrow}>Наше пространство</Text>
            <Text style={styles.coupleName} numberOfLines={1} ellipsizeMode="tail">{user.displayName} + {couple.partnerName}</Text>
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
        <View style={styles.daySummary}>
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Наши желания"
          accessibilityHint="Открыть общие и личные списки желаний"
          onPress={() => router.push('/wishlists')}
          style={({ pressed }) => [styles.wishlists, pressed && styles.pressed]}
        >
          <Text style={styles.wishesTitle}>Наши желания</Text>
          <View style={styles.envelopeFrame}>
            <Image source={require('../../assets/wishes-envelope-soft.png')} style={styles.envelope} resizeMode="contain" accessible={false} />
          </View>
        </Pressable>
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
    gap: spacing.md,
    marginBottom: spacing.xxxl,
  },
  coupleIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexShrink: 1,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
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
    flexShrink: 0,
    width: 44,
    height: 44,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.softRose,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxxl,
  },
  daySummary: { flex: 1, minWidth: 0 },
  wishlists: { flex: 1, minWidth: 0, overflow: 'hidden', alignItems: 'center', gap: 0, paddingVertical: spacing.md },
  wishesTitle: { ...typography.body, fontWeight: '500', color: colors.secondary, textAlign: 'center' },
  envelopeFrame: { alignSelf: 'stretch', aspectRatio: 1.8, overflow: 'hidden' },
  envelope: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
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
