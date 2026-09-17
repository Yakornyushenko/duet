import { ComponentProps, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppDatePicker } from '@/components/AppDatePicker';
import { AppInput } from '@/components/AppInput';
import { AppScreen } from '@/components/AppScreen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useApp } from '@/context/AppContext';
import { useDialog } from '@/context/DialogContext';
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
  const existingEvent = events.find((event) => event.id === eventId);
  const [title, setTitle] = useState(existingEvent?.title ?? '');
  const [eventDate, setEventDate] = useState(existingEvent?.eventDate ?? toDateOnly(new Date()));
  const [recurrence, setRecurrence] = useState<DateRecurrence>(existingEvent?.recurrence ?? 'yearly');
  const [icon, setIcon] = useState<DateEventIcon>(existingEvent?.icon ?? 'heart');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (title.trim().length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      showDialog({
        title: 'Проверьте дату',
        message: 'Добавьте название и выберите корректную дату.',
        tone: 'warning',
      });
      return;
    }

    try {
      setLoading(true);
      const input = { title: title.trim(), eventDate, recurrence, icon };
      if (existingEvent) {
        await updateEvent(existingEvent.id, input);
      } else {
        await addEvent(input);
      }
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

        <AppButton label={existingEvent ? 'Сохранить изменения' : 'Добавить дату'} onPress={() => void save()} loading={loading} />
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
  pressed: {
    opacity: 0.76,
  },
});
