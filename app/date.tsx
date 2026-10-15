import { AppIcon } from '@/components/AppIcon';
import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { BackButton } from '@/components/BackButton';
import { DateCompletionEditor } from '@/components/DateCompletionEditor';
import { useApp } from '@/context/AppContext';
import { useReminders } from '@/context/ReminderContext';
import { getPlannedReminderLabel } from '@/services/reminders';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { entityIcons } from '@/utils/entityIcons';
import { formatEventDate, formatRelationshipDate } from '@/utils/dates';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>;
}

export default function DateScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { events, categories } = useApp();
  const { plannedReminders } = useReminders();
  const event = events.find((item) => item.id === eventId);

  if (!event) {
    return <AppScreen>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Дата</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.emptyCard}>
        <AppIcon name="calendar-outline" size={32} color={colors.primary} />
        <Text style={styles.title}>Дата не найдена</Text>
        <Text style={styles.muted}>Возможно, она уже была удалена.</Text>
        <AppButton label="К списку дат" onPress={() => router.replace('/(tabs)/dates')} />
      </View>
    </AppScreen>;
  }

  const category = categories.find((item) => item.value === event.category)?.label ?? 'Без категории';
  const reminder = getPlannedReminderLabel(plannedReminders, event.id);

  return <AppScreen>
    <View style={styles.header}>
      <BackButton onPress={() => router.back()} />
      <Text style={styles.headerTitle}>Дата</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Редактировать дату"
        onPress={() => router.push({ pathname: '/date-form', params: { id: event.id } })}
        style={styles.iconButton}
      >
        <AppIcon name="create-outline" size={28} color={colors.primary} />
      </Pressable>
    </View>

    <View style={styles.heroCard}>
      <View style={styles.eventIcon}>
        <AppIcon name={entityIcons[event.icon]} size={30} color={colors.primary} />
      </View>
      <Text style={styles.title}>{event.title}</Text>
      {event.description.trim() ? <Text style={styles.description}>{event.description}</Text> : null}
    </View>

    <View style={styles.card}>
      <DetailRow label="Дата" value={formatRelationshipDate(event.eventDate)} />
      <DetailRow label="Повторение" value={event.recurrence === 'yearly' ? 'Каждый год' : 'Один раз'} />
      <DetailRow label="Категория" value={category} />
      {event.recurrence === 'yearly' ? <DetailRow label="Ближайшая" value={formatEventDate(event)} /> : null}
    </View>

    <View style={styles.reminderCard}>
      <View style={styles.reminderIcon}>
        <AppIcon name="notifications-outline" size={22} color={colors.primary} />
      </View>
      <View style={styles.reminderCopy}>
        <Text style={styles.reminderTitle}>Напоминания</Text>
        <Text style={styles.muted}>{reminder || 'Не настроены'}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Настроить напоминания"
        onPress={() => router.push({ pathname: '/date-form', params: { id: event.id } })}
        style={styles.reminderAction}
      >
        <Text style={styles.reminderActionText}>Изменить</Text>
      </Pressable>
    </View>

    <DateCompletionEditor event={event} />
  </AppScreen>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  headerTitle: { ...typography.sectionTitle, color: colors.text, flex: 1, textAlign: 'center' },
  headerSpacer: { width: 44 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.softRose },
  heroCard: { alignItems: 'center', gap: spacing.md, padding: spacing.xxl, marginBottom: spacing.md, borderRadius: radii.xl, backgroundColor: colors.surface },
  eventIcon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: radii.lg, backgroundColor: colors.softRose },
  title: { ...typography.sectionTitle, color: colors.text, textAlign: 'center' },
  description: { ...typography.body, color: colors.text, textAlign: 'center' },
  muted: { ...typography.body, color: colors.muted },
  card: { marginBottom: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.surface },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg, paddingVertical: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  detailLabel: { ...typography.body, color: colors.muted },
  detailValue: { ...typography.body, color: colors.text, flex: 1, textAlign: 'right', fontWeight: '500' },
  reminderCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, marginBottom: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surface },
  reminderIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.softRose },
  reminderCopy: { flex: 1, gap: 2 },
  reminderTitle: { ...typography.cardTitle, color: colors.text },
  reminderAction: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  reminderActionText: { ...typography.label, color: colors.primary },
  emptyCard: { alignItems: 'center', gap: spacing.lg, padding: spacing.xxl, borderRadius: radii.xl, backgroundColor: colors.surface },
});
