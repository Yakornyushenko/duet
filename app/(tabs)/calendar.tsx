import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/components/AppIcon';
import { AppScreen } from '@/components/AppScreen';
import { useApp } from '@/context/AppContext';
import { colors, createThemedStyles, radii, spacing, typography } from '@/theme/tokens';
import { eventOccursOnDate, getCalendarMonthDays } from '@/utils/calendar';
import { toDateOnly } from '@/utils/dates';
import { entityIcons } from '@/utils/entityIcons';

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function CalendarScreen() {
  const { events, categories } = useApp();
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateOnly(today);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1, 12));
  const [selectedDate, setSelectedDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12));
  const todayButtonProgress = useRef(new Animated.Value(0)).current;
  const currentMonthVisible = visibleMonth.getFullYear() === today.getFullYear()
    && visibleMonth.getMonth() === today.getMonth();
  const days = getCalendarMonthDays(visibleMonth.getFullYear(), visibleMonth.getMonth());
  const selectedKey = toDateOnly(selectedDate);
  const selectedEvents = events.filter((event) => eventOccursOnDate(event, selectedDate));
  const eventDateKeys = new Set(days
    .filter((day) => events.some((event) => eventOccursOnDate(event, day.date)))
    .map((day) => day.dateKey));
  const monthLabel = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(visibleMonth);
  const selectedDateLabel = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(selectedDate);

  useEffect(() => {
    Animated.timing(todayButtonProgress, {
      toValue: currentMonthVisible ? 0 : 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [currentMonthVisible, todayButtonProgress]);

  const changeMonth = useCallback((offset: number) => {
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1, 12);
    setVisibleMonth(nextMonth);
    setSelectedDate(nextMonth);
  }, [visibleMonth]);

  const monthSwipeResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) =>
      Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3,
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dx <= -60) changeMonth(1);
      if (gesture.dx >= 60) changeMonth(-1);
    },
  }), [changeMonth]);

  const openDateForm = () => {
    router.push({ pathname: '/date-form', params: { date: selectedKey } });
  };

  const goToToday = () => {
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1, 12));
    setSelectedDate(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12));
  };

  return (
    <AppScreen wide>
      <View style={styles.header}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>Календарь</Text>
          <Text style={styles.subtitle}>Все важные моменты по дням</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Добавить дату"
          onPress={openDateForm}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <AppIcon name="add" size={26} color={colors.onPrimary} />
        </Pressable>
      </View>

      <View style={styles.calendarCard} {...monthSwipeResponder.panHandlers}>
        <View style={styles.monthHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Предыдущий месяц"
            onPress={() => changeMonth(-1)}
            style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}
          >
            <AppIcon name="chevron-back" size={22} color={colors.primary} />
          </Pressable>
          <View style={styles.monthCenter}>
            <Text style={styles.monthTitle}>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</Text>
            <View style={styles.todayButtonSlot} pointerEvents={currentMonthVisible ? 'none' : 'auto'}>
              <Animated.View style={{
                opacity: todayButtonProgress,
                transform: [
                  { translateY: todayButtonProgress.interpolate({ inputRange: [0, 1], outputRange: [-4, 0] }) },
                  { scale: todayButtonProgress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
                ],
              }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Вернуться к сегодняшней дате"
                  disabled={currentMonthVisible}
                  onPress={goToToday}
                  style={({ pressed }) => [styles.todayButton, pressed && styles.pressed]}
                >
                  <AppIcon name="arrow-undo-outline" size={15} color={colors.primary} />
                  <Text style={styles.todayButtonText}>Сегодня</Text>
                </Pressable>
              </Animated.View>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Следующий месяц"
            onPress={() => changeMonth(1)}
            style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}
          >
            <AppIcon name="chevron-forward" size={22} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {weekDays.map((day) => <Text key={day} style={styles.weekDay}>{day}</Text>)}
        </View>
        <View style={styles.daysGrid}>
          {days.map((day) => {
            const selected = day.dateKey === selectedKey;
            const todayDate = day.dateKey === todayKey;
            const hasEvents = eventDateKeys.has(day.dateKey);
            return (
              <View key={day.dateKey} style={styles.dayCell}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long' }).format(day.date)}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setSelectedDate(day.date);
                    if (!day.inCurrentMonth) {
                      setVisibleMonth(new Date(day.date.getFullYear(), day.date.getMonth(), 1, 12));
                    }
                  }}
                  style={({ pressed }) => [
                    styles.dayButton,
                    hasEvents && styles.plannedDay,
                    todayDate && styles.today,
                    selected && styles.selectedDay,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[
                    styles.dayText,
                    !day.inCurrentMonth && styles.otherMonthDay,
                    hasEvents && styles.plannedDayText,
                    selected && styles.selectedDayText,
                  ]}>
                    {day.date.getDate()}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.eventsSection}>
        <Text style={styles.sectionTitle}>{selectedDateLabel}</Text>
        {selectedEvents.length ? (
          <View style={styles.eventList}>
            {selectedEvents.map((event) => (
              <Pressable
                key={event.id}
                accessibilityRole="button"
                accessibilityLabel={`Открыть дату ${event.title}`}
                onPress={() => router.push({ pathname: '/date', params: { id: event.id } })}
                style={({ pressed }) => [styles.eventCard, pressed && styles.pressed]}
              >
                <View style={styles.eventIcon}>
                  <AppIcon name={entityIcons[event.icon]} size={22} color={colors.primary} />
                </View>
                <View style={styles.eventCopy}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventMeta}>
                    {categories.find((category) => category.value === event.category)?.label ?? 'Дата'}
                    {event.recurrence === 'yearly' ? ' · Каждый год' : ''}
                  </Text>
                </View>
                <AppIcon name="chevron-forward" size={20} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyDay}>
            <Text style={styles.emptyDayText}>На этот день ничего не запланировано</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Добавить событие на выбранный день"
              onPress={openDateForm}
              style={({ pressed }) => [styles.emptyAddAction, pressed && styles.pressed]}
            >
              <View style={styles.addButton}>
                <AppIcon name="add" size={26} color={colors.onPrimary} />
              </View>
            </Pressable>
          </View>
        )}
      </View>
    </AppScreen>
  );
}

const styles = createThemedStyles({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxl,
  },
  headingCopy: { gap: spacing.xs },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.muted },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  calendarCard: {
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  monthButton: {
    width: 42,
    height: 42,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.softAccent,
  },
  monthCenter: { flex: 1, alignItems: 'center' },
  monthTitle: { ...typography.sectionTitle, color: colors.text, textAlign: 'center' },
  todayButtonSlot: {
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButton: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.round,
    backgroundColor: colors.softAccent,
  },
  todayButtonText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekDay: {
    width: '14.2857%',
    ...typography.caption,
    color: colors.muted,
    textAlign: 'center',
  },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.2857%', padding: 2 },
  dayButton: {
    width: '100%',
    maxWidth: 48,
    aspectRatio: 1,
    maxHeight: 48,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  plannedDay: { backgroundColor: colors.softAccent },
  today: { borderColor: colors.primary },
  selectedDay: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { ...typography.body, color: colors.text, fontWeight: '500' },
  otherMonthDay: { color: colors.muted },
  plannedDayText: { color: colors.primary, fontWeight: '700' },
  selectedDayText: { color: colors.onPrimary, fontWeight: '700' },
  eventsSection: { gap: spacing.md, marginTop: spacing.xxl },
  sectionTitle: { ...typography.sectionTitle, color: colors.text },
  eventList: { gap: spacing.md },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  eventIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.softAccent,
  },
  eventCopy: { flex: 1, gap: 2 },
  eventTitle: { ...typography.cardTitle, color: colors.text },
  eventMeta: { ...typography.caption, color: colors.muted },
  emptyDay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  emptyDayText: { ...typography.body, flex: 1, color: colors.muted },
  emptyAddAction: {
    flexShrink: 0,
  },
  pressed: { opacity: 0.7 },
});
