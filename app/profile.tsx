import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Href, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppScreen } from '@/components/AppScreen';
import { PairAvatars } from '@/components/PairAvatars';
import { IntimateQuestionSettings } from '@/components/IntimateQuestionSettings';
import { RelationshipDateEditor } from '@/components/RelationshipDateEditor';
import { useApp } from '@/context/AppContext';
import { useDialog } from '@/context/DialogContext';
import { useReminders } from '@/context/ReminderContext';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { formatRelationshipDate } from '@/utils/dates';

export default function ProfileScreen() {
  const { user, couple, signOut, deleteAccount, updateDisplayName } = useApp();
  const { showDialog } = useDialog();
  const {
    enabled: remindersEnabled,
    initializing: remindersInitializing,
    setEnabled: setRemindersEnabled,
    openSystemSettings,
  } = useReminders();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [nameSaving, setNameSaving] = useState(false);
  const [accountDeleting, setAccountDeleting] = useState(false);
  const [relationshipDateEditorVisible, setRelationshipDateEditorVisible] = useState(false);

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
  }, [user?.displayName]);

  const saveDisplayName = async () => {
    const normalizedName = displayName.trim();
    if (!normalizedName) {
      showDialog({
        title: 'Проверьте имя',
        message: 'Имя не может быть пустым.',
        tone: 'warning',
      });
      return;
    }
    if (normalizedName === user?.displayName) {
      return;
    }

    try {
      setNameSaving(true);
      await updateDisplayName(normalizedName);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      showDialog({
        title: 'Не получилось изменить имя',
        message: error instanceof Error ? error.message : 'Попробуйте ещё раз.',
        tone: 'danger',
      });
    } finally {
      setNameSaving(false);
    }
  };

  const changeRemindersEnabled = async (enabled: boolean) => {
    const updated = await setRemindersEnabled(enabled);
    if (!updated) {
      showDialog({
        title: 'Разрешите уведомления',
        message: 'Включите уведомления для Duet в настройках телефона.',
        tone: 'warning',
        actions: [
          { label: 'Открыть настройки', onPress: openSystemSettings },
          { label: 'Отмена', variant: 'ghost' },
        ],
      });
    }
  };

  if (!user || !couple) {
    return null;
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Назад в Ещё"
          onPress={() => router.canGoBack() ? router.back() : router.replace('/more')}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.title}>Профиль</Text>
      </View>

      <View style={styles.coupleCard}>
        <PairAvatars firstName={user.displayName} secondName={couple.partnerName} size={64} />
        <View style={styles.centeredCopy}>
          <Text style={styles.coupleName}>{user.displayName}{couple.partnerName ? ` + ${couple.partnerName}` : ''}</Text>
          <View style={styles.connectedRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.connected}>{couple.partnerName ? 'Вы связаны' : 'Личное пространство'}</Text>
          </View>
        </View>
      </View>

      {!couple.partnerName && <AppButton label="Пригласить партнёра" variant="secondary" onPress={() => router.push('/pair')} />}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>О паре</Text>
        <View style={styles.detailsCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Изменить дату начала отношений"
            onPress={() => setRelationshipDateEditorVisible(true)}
            style={({ pressed }) => [styles.detailRow, pressed && styles.pressed]}
          >
            <View style={styles.detailIcon}>
              <Ionicons name="heart-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailCopy}>
              <Text style={styles.detailLabel}>Вместе с</Text>
              <Text style={styles.detailValue}>{couple.relationshipStartedAt ? formatRelationshipDate(couple.relationshipStartedAt) : 'Добавить дату'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        </View>
      </View>

      <RelationshipDateEditor
        visible={relationshipDateEditorVisible}
        onClose={() => setRelationshipDateEditorVisible(false)}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ваш профиль</Text>
        <View style={styles.profileForm}>
          <AppInput
            label="Имя"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={50}
            autoCapitalize="words"
            textContentType="name"
            onSubmitEditing={() => void saveDisplayName()}
          />
          <AppButton
            label="Сохранить имя"
            onPress={() => void saveDisplayName()}
            loading={nameSaving}
            disabled={displayName.trim() === user.displayName}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Настройки аккаунта</Text>
        <IntimateQuestionSettings />
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="notifications-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailCopy}>
              <Text style={styles.detailValue}>Напоминания</Text>
              <Text style={styles.detailLabel}>
                {remindersEnabled ? 'Включены для выбранных дат' : 'Выключены'}
              </Text>
            </View>
            <Switch
              accessibilityLabel="Напоминания"
              value={remindersEnabled}
              disabled={remindersInitializing}
              onValueChange={(value) => void changeRemindersEnabled(value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
          <View style={styles.separator} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Открыть системные настройки уведомлений"
            onPress={() => void openSystemSettings()}
            style={({ pressed }) => [styles.detailRow, pressed && styles.pressed]}
          >
            <View style={styles.detailIcon}>
              <Ionicons name="volume-medium-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailCopy}>
              <Text style={styles.detailValue}>Настройки уведомлений</Text>
              <Text style={styles.detailLabel}>Звук и вибрация настраиваются в системе</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        </View>
      </View>

      <View style={styles.logoutButton}>
        <AppButton
          label="Удалить аккаунт и данные"
          variant="danger"
          loading={accountDeleting}
          onPress={() =>
            showDialog({
              title: 'Удалить аккаунт навсегда?',
              message: 'Аккаунт, профиль, ваши ответы, даты, желания, комментарии, push-токены и загруженные фотографии будут удалены. Совместные материалы без однозначного автора могут остаться у партнёра без связи с вашим аккаунтом. Это действие нельзя отменить.',
              tone: 'danger',
              actions: [
                {
                  label: 'Удалить навсегда',
                  variant: 'danger',
                  onPress: async () => {
                    try {
                      setAccountDeleting(true);
                      await deleteAccount();
                      router.replace('/auth');
                    } catch (error) {
                      showDialog({
                        title: 'Не получилось удалить аккаунт',
                        message: error instanceof Error ? error.message : 'Проверьте подключение и попробуйте ещё раз.',
                        tone: 'danger',
                      });
                    } finally {
                      setAccountDeleting(false);
                    }
                  },
                },
                { label: 'Отмена', variant: 'ghost' },
              ],
            })
          }
        />
        <AppButton
          label="Как удаляются данные"
          variant="ghost"
          onPress={() => router.push('/delete-account' as Href)}
        />
        <AppButton
          label="Выйти из аккаунта"
          variant="danger"
          onPress={() =>
            showDialog({
              title: 'Выйти из аккаунта?',
              message: 'Общие даты останутся сохранены.',
              tone: 'danger',
              actions: [
                {
                  label: 'Выйти',
                  variant: 'danger',
                  onPress: async () => {
                    try {
                      await signOut();
                      router.replace('/');
                    } catch (error) {
                      showDialog({
                        title: 'Не получилось выйти',
                        message: error instanceof Error ? error.message : 'Попробуйте ещё раз.',
                        tone: 'danger',
                      });
                    }
                  },
                },
                { label: 'Отмена', variant: 'ghost' },
              ],
            })
          }
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxxl,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  backButton: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radii.md, backgroundColor: colors.softRose,
  },
  coupleCard: {
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xxl,
  },
  centeredCopy: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  coupleName: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  connected: {
    ...typography.label,
    color: colors.success,
  },
  section: {
    gap: spacing.md,
    marginTop: spacing.xxxl,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
  },
  profileForm: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  detailIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.sm,
    backgroundColor: colors.softRose,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCopy: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.muted,
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
  },
  separator: {
    height: 1,
    marginLeft: 54,
    backgroundColor: colors.border,
  },
  logoutButton: {
    marginTop: spacing.huge,
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.68,
  },
});
