import { useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { DateCategoryPicker } from '@/components/DateCategoryPicker';
import { AppButton } from '@/components/AppButton';
import { AppDatePicker } from '@/components/AppDatePicker';
import { AppTimePicker } from '@/components/AppTimePicker';
import { EventIconPicker } from '@/components/EventIconPicker';
import { AppInput } from '@/components/AppInput';
import { AppScreen } from '@/components/AppScreen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useApp } from '@/context/AppContext';
import { useDialog } from '@/context/DialogContext';
import { useReminders } from '@/context/ReminderContext';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { DateCategory, DateEventIcon, DateRecurrence } from '@/types/domain';
import { formatRelationshipDate, getNextOccurrence, toDateOnly } from '@/utils/dates';

export default function DateFormScreen() {
  const params = useLocalSearchParams<{ id?: string | string[]; category?: string }>();
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { events, categories, addEvent, updateEvent, deleteEvent } = useApp();
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
  const [category, setCategory] = useState<DateCategory>(
    existingEvent?.category ?? categories.find((option) => option.value === params.category)?.value ?? categories[0]?.value ?? '',
  );
  useEffect(() => {
    if (!categories.some((item) => item.value === category)) setCategory(categories[0]?.value ?? '');
  }, [categories, category]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [notifications, setNotifications] = useState<{ date: string; time: string; text?: string }[]>([]);
  const [editingReminder, setEditingReminder] = useState<number | null>(null);
  const [reminderDatePicker, setReminderDatePicker] = useState(false);
  const deadline = toDateOnly(getNextOccurrence({ id: eventId ?? '', title, eventDate, recurrence, icon, category }));

  useEffect(() => {
    if (remindersInitializing) {
      return;
    }
    const settings = getEventSettings(existingEvent?.id);
    setReminderEnabled(settings.enabled);
    setNotifications(settings.notifications ?? (existingEvent ? settings.offsets.map((offset) => {
      const date = getNextOccurrence(existingEvent);
      date.setDate(date.getDate() - offset);
      return { date: toDateOnly(date), time: settings.time };
    }) : []));
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

  const updateReminder = (change: Partial<{ date: string; time: string }>) => {
    setNotifications((current) => current.map((item, index) => index === editingReminder ? { ...item, ...change } : item));
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
    if (reminderEnabled && notifications.length === 0) {
      showDialog({
        title: 'Когда напомнить?',
        message: 'Настройте хотя бы одно уведомление.',
        tone: 'warning',
      });
      return;
    }
    if (reminderEnabled && notifications.some((item) => item.date > deadline
      || new Date(`${item.date}T${item.time}:00`) <= new Date())) {
      showDialog({
        title: 'Проверьте уведомления',
        message: 'Выберите будущее время не позже дня события.',
        tone: 'warning',
      });
      return;
    }
    if (reminderEnabled && new Set(notifications.map((item) => `${item.date}T${item.time}`)).size !== notifications.length) {
      showDialog({ title: 'Одинаковые уведомления', message: 'Выберите разное время для каждого уведомления.', tone: 'warning' });
      return;
    }

    try {
      setLoading(true);
      if (!categories.some((item) => item.value === category)) {
        showDialog({ title: 'Выберите категорию', message: 'Добавьте категорию с помощью плюсика и выберите её для даты.' });
        return;
      }
      const input = { title: title.trim(), eventDate, recurrence, icon, category };
      const savedEvent = existingEvent
        ? await updateEvent(existingEvent.id, input)
        : await addEvent(input);
      await saveEventSettings(savedEvent.id, {
        enabled: reminderEnabled,
        offsets: [],
        time: '10:00',
        notifications,
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
          <Text style={styles.label}>Категория</Text>
          <DateCategoryPicker value={category} onChange={setCategory} />
        </View>

        <EventIconPicker value={icon} onChange={(value) => { setIcon(value); void Haptics.selectionAsync(); }} />

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
                {notifications.map((item, index) => (
                  <View key={index} style={styles.field}>
                    <AppInput
                      label=""
                      accessibilityLabel={`Текст уведомления ${index + 1}`}
                      placeholder="Текст уведомления"
                      value={item.text ?? ''}
                      maxLength={200}
                      autoCapitalize="sentences"
                      onChangeText={(text) => setNotifications((current) => current.map((notification, position) =>
                        position === index ? { ...notification, text } : notification))}
                    />
                    <AppButton
                      label={formatRelationshipDate(item.date)}
                      variant="secondary"
                      onPress={() => { setEditingReminder(index); setReminderDatePicker(true); }}
                    />
                    <AppButton
                      label={item.time}
                      variant="secondary"
                      onPress={() => { setEditingReminder(index); setShowTimePicker(true); }}
                    />
                    <AppButton label="Удалить уведомление" variant="ghost"
                      onPress={() => setNotifications((current) => current.filter((_, position) => position !== index))} />
                  </View>
                ))}
                {notifications.length < 4 ? (
                  <AppButton label="Настроить день" variant="secondary" onPress={() => {
                    setEditingReminder(notifications.length);
                    setNotifications((current) => [...current, { date: deadline, time: '10:00' }]);
                    setReminderDatePicker(true);
                  }} />
                ) : null}
                <AppDatePicker
                  visible={reminderDatePicker}
                  title="День уведомления"
                  maximumDate={deadline}
                  value={notifications[editingReminder ?? -1]?.date ?? deadline}
                  onSelect={(date) => updateReminder({ date })}
                  onClose={() => setReminderDatePicker(false)}
                />
                <AppTimePicker
                  visible={showTimePicker}
                  value={notifications[editingReminder ?? -1]?.time ?? '10:00'}
                  onSelect={(time) => updateReminder({ time })}
                  onClose={() => setShowTimePicker(false)}
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
  timeField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
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
