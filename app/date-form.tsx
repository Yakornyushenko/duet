import { ComponentProps, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppDatePicker } from '@/components/AppDatePicker';
import { AppInput } from '@/components/AppInput';
import { AppScreen } from '@/components/AppScreen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useApp } from '@/context/AppContext';
import { useDialog } from '@/context/DialogContext';
import { useReminders } from '@/context/ReminderContext';
import { ReminderOffset } from '@/services/reminders';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { DateEventIcon, DateRecurrence } from '@/types/domain';
import { formatRelationshipDate, toDateOnly } from '@/utils/dates';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const iconOptions: { value: DateEventIcon; icon: IoniconName; label: string }[] = [
  { value: 'heart', icon: 'heart-outline', label: 'Любовь' },
  { value: 'sparkles', icon: 'sparkles-outline', label: 'Событие' },
  { value: 'gift', icon: 'gift-outline', label: 'Подарок' },
  { value: 'cake', icon: 'calendar-outline', label: 'День рождения' },
  { value: 'plane', icon: 'airplane-outline', label: 'Путешествие' },
];

export default function DateFormScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { events, addEvent, updateEvent, deleteEvent } = useApp();
  const { showDialog } = useDialog();
  const {
    initializing: remindersInitializing,
    getEventSettings,
    setEnabled: setRemindersEnabled,
    saveEventSettings,
    removeEventSettings,
    openSystemSettings,
  } = useReminders();
  const existingEvent = events.find((event) => event.id === eventId);
  const [title, setTitle] = useState(existingEvent?.title ?? '');
  const [eventDate, setEventDate] = useState(existingEvent?.eventDate ?? toDateOnly(new Date()));
  const [recurrence, setRecurrence] = useState<DateRecurrence>(existingEvent?.recurrence ?? 'yearly');
  const [icon, setIcon] = useState<DateEventIcon>(existingEvent?.icon ?? 'heart');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderOffsets, setReminderOffsets] = useState<ReminderOffset[]>([7, 0]);
  const [reminderTime, setReminderTime] = useState('10:00');

  useEffect(() => {
    if (remindersInitializing) {
      return;
    }
    const settings = getEventSettings(existingEvent?.id);
    setReminderEnabled(settings.enabled);
    setReminderOffsets(settings.offsets);
    setReminderTime(settings.time);
  }, [existingEvent?.id, remindersInitializing]);

  const showNotificationSettingsDialog = () => {
    showDialog({
      title: 'Разрешите уведомления',
      message: 'Включите уведомления для Duet в настройках телефона.',
      tone: 'warning',
      actions: [
        { label: 'Открыть настройки', onPress: openSystemSettings },
        { label: 'Отмена', variant: 'ghost' },
      ],
    });
  };

  const changeReminderEnabled = async (enabled: boolean) => {
    if (!enabled) {
      setReminderEnabled(false);
      return;
    }

    const permissionGranted = await setRemindersEnabled(true);
    if (permissionGranted) {
      setReminderEnabled(true);
    } else {
      showNotificationSettingsDialog();
    }
  };

  const toggleReminderOffset = (offset: ReminderOffset) => {
    setReminderOffsets((current) => current.includes(offset)
      ? current.filter((value) => value !== offset)
      : [...current, offset]);
    void Haptics.selectionAsync();
  };

  const save = async () => {
    if (title.trim().length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      showDialog({
        title: 'Проверьте дату',
        message: 'Добавьте название и выберите корректную дату.',
        tone: 'warning',
      });
      return;
    }
    if (reminderEnabled && reminderOffsets.length === 0) {
      showDialog({
        title: 'Когда напомнить?',
        message: 'Выберите хотя бы один вариант напоминания.',
        tone: 'warning',
      });
      return;
    }
    if (reminderEnabled && !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime)) {
      showDialog({
        title: 'Проверьте время',
        message: 'Укажите время в формате 10:00.',
        tone: 'warning',
      });
      return;
    }

    try {
      setLoading(true);
      const input = { title: title.trim(), eventDate, recurrence, icon };
      const savedEvent = existingEvent
        ? await updateEvent(existingEvent.id, input)
        : await addEvent(input);
      await saveEventSettings(savedEvent.id, {
        enabled: reminderEnabled,
        offsets: reminderOffsets,
        time: reminderTime,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      showDialog({
        title: 'Не получилось сохранить',
        message: error instanceof Error ? error.message : 'Попробуйте ещё раз.',
        tone: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = () => {
    if (!existingEvent) {
      return;
    }
    showDialog({
      title: 'Удалить дату?',
      message: 'Она исчезнет из общего календаря у обоих партнёров.',
      tone: 'danger',
      actions: [
        {
          label: 'Удалить',
          variant: 'danger',
          onPress: async () => {
            try {
              await deleteEvent(existingEvent.id);
              await removeEventSettings(existingEvent.id);
              router.back();
            } catch (error) {
              showDialog({
                title: 'Не получилось удалить',
                message: error instanceof Error ? error.message : 'Попробуйте ещё раз.',
                tone: 'danger',
              });
            }
          },
        },
        { label: 'Отмена', variant: 'ghost' },
      ],
    });
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Назад" onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{existingEvent ? 'Редактировать дату' : 'Новая дата'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.form}>
        <AppInput
          label="Название"
          placeholder="Например, наша годовщина"
          value={title}
          onChangeText={setTitle}
          autoCapitalize="sentences"
          maxLength={80}
        />

        <View style={styles.field}>
          <Text style={styles.label}>Дата</Text>
          <AppButton
            label={formatRelationshipDate(eventDate)}
            variant="secondary"
            onPress={() => setShowDatePicker(true)}
          />
          <AppDatePicker
            visible={showDatePicker}
            value={eventDate}
            title="Дата события"
            onSelect={setEventDate}
            onClose={() => setShowDatePicker(false)}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Повторение</Text>
          <SegmentedControl
            value={recurrence}
            onChange={setRecurrence}
            options={[
              { label: 'Каждый год', value: 'yearly' },
              { label: 'Один раз', value: 'none' },
            ]}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Значок</Text>
          <View style={styles.iconGrid}>
            {iconOptions.map((option) => {
              const isSelected = icon === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ checked: isSelected }}
                  onPress={() => {
                    setIcon(option.value);
                    void Haptics.selectionAsync();
                  }}
                  style={({ pressed }) => [
                    styles.iconChoice,
                    isSelected && styles.iconChoiceSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name={option.icon} size={23} color={isSelected ? colors.white : colors.primary} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Напоминания</Text>
          <View style={styles.reminderCard}>
            <View style={styles.reminderHeader}>
              <View style={styles.reminderIcon}>
                <Ionicons name="notifications-outline" size={21} color={colors.primary} />
              </View>
              <View style={styles.reminderCopy}>
                <Text style={styles.reminderTitle}>Напомнить об этой дате</Text>
                <Text style={styles.reminderSubtitle}>Уведомления придут на это устройство</Text>
              </View>
              <Switch
                accessibilityLabel="Напомнить об этой дате"
                value={reminderEnabled}
                disabled={remindersInitializing}
                onValueChange={(value) => void changeReminderEnabled(value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            {reminderEnabled ? (
              <View style={styles.reminderOptions}>
                <Text style={styles.reminderOptionsLabel}>Когда напомнить</Text>
                <View style={styles.offsets}>
                  {([
                    { value: 7 as const, label: 'За неделю' },
                    { value: 1 as const, label: 'За день' },
                    { value: 0 as const, label: 'В день события' },
                  ]).map((option) => {
                    const selected = reminderOffsets.includes(option.value);
                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                        onPress={() => toggleReminderOffset(option.value)}
                        style={({ pressed }) => [
                          styles.offsetOption,
                          selected && styles.offsetOptionSelected,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Ionicons
                          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                          size={20}
                          color={selected ? colors.primary : colors.muted}
                        />
                        <Text style={[styles.offsetLabel, selected && styles.offsetLabelSelected]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <AppInput
                  label="Время"
                  value={reminderTime}
                  onChangeText={setReminderTime}
                  placeholder="10:00"
                  maxLength={5}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            ) : null}
          </View>
        </View>

        <AppButton
          label={existingEvent ? 'Сохранить изменения' : 'Добавить дату'}
          onPress={() => void save()}
          loading={loading}
          disabled={remindersInitializing}
        />
        {existingEvent ? <AppButton label="Удалить дату" variant="danger" onPress={confirmDelete} /> : null}
      </View>
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
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  headerTitle: {
    ...typography.cardTitle,
    color: colors.text,
  },
  headerSpacer: {
    width: 44,
  },
  form: {
    gap: spacing.xxl,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.text,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  iconChoice: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.softRose,
  },
  iconChoiceSelected: {
    backgroundColor: colors.primary,
  },
  reminderCard: {
    overflow: 'hidden',
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
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
  reminderTitle: {
    ...typography.body,
    color: colors.text,
  },
  reminderSubtitle: {
    ...typography.caption,
    color: colors.muted,
  },
  reminderOptions: {
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reminderOptionsLabel: {
    ...typography.label,
    color: colors.text,
  },
  offsets: {
    gap: spacing.sm,
  },
  offsetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  offsetOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.softRose,
  },
  offsetLabel: {
    ...typography.body,
    color: colors.muted,
  },
  offsetLabelSelected: {
    color: colors.text,
  },
  pressed: {
    opacity: 0.76,
  },
});
