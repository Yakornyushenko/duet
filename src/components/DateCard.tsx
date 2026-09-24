import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radii, spacing, typography } from '@/theme/tokens';
import { dateCategories, DateEvent } from '@/types/domain';
import { formatEventDate, getDaysUntil, pluralizeDays } from '@/utils/dates';
import { eventIcons } from '@/utils/eventIcons';

type DateCardProps = {
  event: DateEvent;
  highlighted?: boolean;
  reminderLabel?: string;
  onPress?: () => void;
};

export function DateCard({ event, highlighted = false, reminderLabel, onPress }: DateCardProps) {
  const days = getDaysUntil(event);
  const absoluteDays = Math.abs(days);
  const content = (
    <View style={styles.row}>
      <View style={[
        styles.icon,
        reminderLabel && !highlighted && styles.reminderEventIcon,
        highlighted && styles.highlightedIcon,
      ]}>
        <Ionicons name={eventIcons[event.icon]} size={21} color={highlighted ? colors.white : colors.primary} />
      </View>
      <View style={styles.main}>
        {highlighted ? <Text style={styles.eyebrow}>Следующая дата</Text> : null}
        <Text style={[styles.title, highlighted && styles.highlightedText]} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={[styles.date, highlighted && styles.highlightedSecondary]}>{formatEventDate(event)}</Text>
        <Text style={[styles.date, highlighted && styles.highlightedSecondary]}>
          {dateCategories.find((category) => category.value === event.category)?.label}
        </Text>
        {reminderLabel ? (
          <View style={styles.reminderStatus}>
            <Ionicons
              name="notifications-outline"
              size={15}
              color={highlighted ? colors.white : colors.primary}
            />
            <Text style={[styles.reminderLabel, highlighted && styles.highlightedSecondary]}>
              {reminderLabel}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.counter}>
        <Text style={[styles.days, highlighted && styles.highlightedText]}>
          {days === 0 ? 'Сегодня' : absoluteDays}
        </Text>
        {days > 0 ? (
          <Text style={[styles.dayLabel, highlighted && styles.highlightedSecondary]}>{pluralizeDays(days)}</Text>
        ) : days < 0 ? (
          <Text style={[styles.dayLabel, highlighted && styles.highlightedSecondary]}>
            {pluralizeDays(absoluteDays)} назад
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (highlighted) {
    return (
      <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} disabled={!onPress}>
        {({ pressed }) => (
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.highlightedCard, pressed && styles.pressed]}
          >
            {content}
            <View style={styles.glow} />
          </LinearGradient>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        reminderLabel && styles.cardWithReminder,
        pressed && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  cardWithReminder: {
    backgroundColor: colors.softRose,
  },
  highlightedCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    zIndex: 1,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.softRose,
  },
  reminderEventIcon: {
    backgroundColor: colors.surface,
  },
  highlightedIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  main: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.78)',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.cardTitle,
    color: colors.text,
  },
  date: {
    ...typography.caption,
    color: colors.muted,
  },
  reminderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  reminderLabel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '500',
  },
  counter: {
    alignItems: 'flex-end',
    minWidth: 52,
  },
  days: {
    ...typography.cardTitle,
    color: colors.text,
  },
  dayLabel: {
    ...typography.caption,
    color: colors.muted,
  },
  highlightedText: {
    color: colors.white,
  },
  highlightedSecondary: {
    color: 'rgba(255, 255, 255, 0.82)',
  },
  glow: {
    position: 'absolute',
    width: 116,
    height: 116,
    borderRadius: 58,
    right: -34,
    top: -46,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  pressed: {
    opacity: 0.84,
  },
});
