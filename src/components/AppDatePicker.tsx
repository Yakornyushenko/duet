import { AppIcon } from '@/components/AppIcon';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { colors, radii, shadow, spacing, typography } from '@/theme/tokens';
import { formatRelationshipDate, parseDateOnly, toDateOnly } from '@/utils/dates';

const monthNames = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const yearsPerPage = 12;

type CalendarDay = {
  key: string;
  value: string;
  label: number;
  isCurrentMonth: boolean;
};

type AppDatePickerProps = {
  visible: boolean;
  value: string;
  title?: string;
  maximumDate?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
};

function getMonthStart(value: string): Date {
  const date = parseDateOnly(value);
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

function getYearPageStart(year: number): number {
  return Math.floor(year / yearsPerPage) * yearsPerPage;
}

function getCalendarDays(month: Date): CalendarDay[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const mondayOffset = (new Date(year, monthIndex, 1, 12).getDay() + 6) % 7;

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, monthIndex, index - mondayOffset + 1, 12);
    const value = toDateOnly(date);
    return {
      key: value,
      value,
      label: date.getDate(),
      isCurrentMonth: date.getMonth() === monthIndex,
    };
  });
}

export function AppDatePicker({
  visible,
  value,
  title = 'Выберите дату',
  maximumDate,
  onSelect,
  onClose,
}: AppDatePickerProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthStart(value));
  const [selectingYear, setSelectingYear] = useState(false);
  const [yearPageStart, setYearPageStart] = useState(() => getYearPageStart(getMonthStart(value).getFullYear()));
  const { isTablet, modalMaxWidth } = useResponsiveLayout();
  const days = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const years = useMemo(
    () => Array.from({ length: yearsPerPage }, (_, index) => yearPageStart + index),
    [yearPageStart],
  );
  const today = toDateOnly(new Date());
  const maximumMonth = maximumDate ? getMonthStart(maximumDate) : null;
  const maximumYear = maximumMonth?.getFullYear();
  const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1, 12);
  const canNavigateNext = !maximumMonth || nextMonth <= maximumMonth;
  const canNavigateNextYearPage = maximumYear === undefined || yearPageStart + yearsPerPage <= maximumYear;

  useEffect(() => {
    if (visible) {
      const selectedMonth = getMonthStart(value);
      setVisibleMonth(selectedMonth);
      setYearPageStart(getYearPageStart(selectedMonth.getFullYear()));
      setSelectingYear(false);
    }
  }, [value, visible]);

  const selectDate = (date: string) => {
    void Haptics.selectionAsync();
    onSelect(date);
    onClose();
  };

  const changeMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12));
  };

  const selectYear = (year: number) => {
    const month = maximumMonth && year === maximumYear
      ? Math.min(visibleMonth.getMonth(), maximumMonth.getMonth())
      : visibleMonth.getMonth();
    setVisibleMonth(new Date(year, month, 1, 12));
    setSelectingYear(false);
    void Haptics.selectionAsync();
  };

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Закрыть календарь"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View style={[styles.card, { maxWidth: modalMaxWidth }]}>
          <View style={styles.heading}>
            <View style={styles.icon}>
              <AppIcon name="calendar-outline" size={28} color={colors.primary} />
            </View>
            <View style={styles.headingCopy}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.selectedDate}>{formatRelationshipDate(value)}</Text>
            </View>
          </View>

          {selectingYear ? (
            <>
              <View style={styles.monthHeader}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Предыдущие годы"
                  onPress={() => setYearPageStart((current) => current - yearsPerPage)}
                  style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}
                >
                  <AppIcon name="chevron-back" size={22} color={colors.secondary} />
                </Pressable>
                <Text style={styles.monthTitle}>{yearPageStart}–{yearPageStart + yearsPerPage - 1}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Следующие годы"
                  disabled={!canNavigateNextYearPage}
                  onPress={() => setYearPageStart((current) => current + yearsPerPage)}
                  style={({ pressed }) => [
                    styles.monthButton,
                    !canNavigateNextYearPage && styles.disabled,
                    pressed && canNavigateNextYearPage && styles.pressed,
                  ]}
                >
                  <AppIcon name="chevron-forward" size={22} color={colors.secondary} />
                </Pressable>
              </View>
              <View style={styles.yearGrid}>
                {years.map((year) => {
                  const selected = year === visibleMonth.getFullYear();
                  const disabled = maximumYear !== undefined && year > maximumYear;
                  return (
                    <View key={year} style={styles.yearSlot}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Выбрать ${year} год`}
                        accessibilityState={{ selected, disabled }}
                        disabled={disabled}
                        onPress={() => selectYear(year)}
                        style={({ pressed }) => [
                          styles.yearButton,
                          selected && styles.selectedDay,
                          disabled && styles.disabled,
                          pressed && !disabled && styles.pressed,
                        ]}
                      >
                        <Text style={[styles.dayText, selected && styles.selectedDayText]}>{year}</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </>
          ) : (
            <>
              <View style={styles.monthHeader}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Предыдущий месяц"
                  onPress={() => changeMonth(-1)}
                  style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}
                >
                  <AppIcon name="chevron-back" size={22} color={colors.secondary} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Выбрать год"
                  accessibilityHint="Открыть список годов"
                  onPress={() => {
                    setYearPageStart(getYearPageStart(visibleMonth.getFullYear()));
                    setSelectingYear(true);
                  }}
                  style={({ pressed }) => [styles.monthTitleButton, pressed && styles.pressed]}
                >
                  <Text style={styles.monthTitle}>
                    {monthNames[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Следующий месяц"
                  disabled={!canNavigateNext}
                  onPress={() => changeMonth(1)}
                  style={({ pressed }) => [styles.monthButton, !canNavigateNext && styles.disabled, pressed && styles.pressed]}
                >
                  <AppIcon name="chevron-forward" size={22} color={colors.secondary} />
                </Pressable>
              </View>

              <View style={styles.weekRow}>
                {weekDays.map((day) => (
                  <Text key={day} style={styles.weekDay}>{day}</Text>
                ))}
              </View>

              <View style={styles.grid}>
                {days.map((day) => {
                  const selected = day.value === value;
                  const isToday = day.value === today;
                  const disabled = Boolean(maximumDate && day.value > maximumDate);
                  return (
                    <View key={day.key} style={[styles.daySlot, isTablet && styles.tabletDaySlot]}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={formatRelationshipDate(day.value)}
                        accessibilityState={{ selected, disabled }}
                        disabled={disabled}
                        onPress={() => selectDate(day.value)}
                        style={({ pressed }) => [
                          styles.day,
                          isTablet && styles.tabletDay,
                          isToday && !selected && styles.today,
                          selected && styles.selectedDay,
                          disabled && styles.disabled,
                          pressed && !disabled && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            !day.isCurrentMonth && styles.outsideDayText,
                            selected && styles.selectedDayText,
                          ]}
                        >
                          {day.label}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          <View style={styles.actions}>
            {!selectingYear && (!maximumDate || today <= maximumDate) && value !== today ? (
              <AppButton label="Сегодня" variant="secondary" onPress={() => selectDate(today)} />
            ) : null}
            <AppButton label="Отмена" variant="ghost" onPress={onClose} />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.overlay,
  },
  card: {
    width: '100%',
    padding: spacing.xl,
    gap: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.background,
    ...shadow,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.softRose,
    transform: [{ rotate: '-5deg' }],
  },
  headingCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.cardTitle,
    color: colors.text,
  },
  selectedDate: {
    ...typography.caption,
    color: colors.muted,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.softRose,
  },
  monthTitle: {
    ...typography.cardTitle,
    color: colors.secondary,
    textTransform: 'capitalize',
  },
  monthTitleButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekDay: {
    ...typography.caption,
    width: '14.2857%',
    color: colors.muted,
    textAlign: 'center',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: spacing.sm,
  },
  yearSlot: {
    width: '33.3333%',
    padding: spacing.xs,
  },
  yearButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  daySlot: {
    width: '14.2857%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabletDaySlot: {
    height: 52,
  },
  day: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
  },
  tabletDay: {
    width: 46,
    height: 46,
  },
  today: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  selectedDay: {
    backgroundColor: colors.primary,
  },
  dayText: {
    ...typography.label,
    color: colors.text,
  },
  outsideDayText: {
    color: colors.muted,
    opacity: 0.45,
  },
  selectedDayText: {
    color: colors.white,
    fontWeight: '700',
    opacity: 1,
  },
  disabled: {
    opacity: 0.28,
  },
  pressed: {
    opacity: 0.68,
  },
  actions: {
    gap: spacing.xs,
  },
});
