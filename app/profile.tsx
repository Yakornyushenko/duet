import { AppIcon } from '@/components/AppIcon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Href, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppScreen } from '@/components/AppScreen';
import { BackButton } from '@/components/BackButton';
import { quotedAppName } from '@/config/app';
import { InvitePartnerCallout } from '@/components/InvitePartnerCallout';
import { PairAvatars } from '@/components/PairAvatars';
import { IntimateQuestionSettings } from '@/components/IntimateQuestionSettings';
import { RelationshipDateEditor } from '@/components/RelationshipDateEditor';
import { useApp } from '@/context/AppContext';
import { useDialog } from '@/context/DialogContext';
import { useReminders } from '@/context/ReminderContext';
import { useTheme } from '@/context/ThemeContext';
import { colors, createThemedStyles, radii, spacing, type AppColors, type ThemeName, themePalettes, typography } from '@/theme/tokens';
import { formatRelationshipDate } from '@/utils/dates';

type ThemeOptionButtonProps = {
  label: string;
  palette: AppColors;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
};

const themeLabels: Record<ThemeName, string> = {
  rose: 'Розовая',
  emerald: 'Изумрудная',
  honey: 'Медовая',
};

let profileScrollOffsetToRestore: number | null = null;
const PROFILE_THEME_SCROLL_STORAGE_KEY = 'duet:profile-theme-scroll-offset';

function ThemeOptionButton({ label, palette, selected, disabled, onPress }: ThemeOptionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Выбрать тему «${label}»`}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.themeOptionButton,
        { backgroundColor: pressed ? palette.primaryPressed : palette.primary },
        disabled && styles.themeOptionButtonDisabled,
      ]}
    >
      <Text style={styles.themeOptionLabel}>{label}</Text>
      {selected ? <AppIcon name="checkmark-circle" size={22} color={palette.white} /> : null}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { user, couple, signOut, deleteAccount, updateDisplayName } = useApp();
  const { showDialog } = useDialog();
  const { theme, setTheme } = useTheme();
  const {
    enabled: remindersEnabled,
    initializing: remindersInitializing,
    setEnabled: setRemindersEnabled,
    openSystemSettings,
  } = useReminders();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [nameSaving, setNameSaving] = useState(false);
  const [themeSaving, setThemeSaving] = useState(false);
  const [themePickerVisible, setThemePickerVisible] = useState(false);
  const [accountDeleting, setAccountDeleting] = useState(false);
  const [relationshipDateEditorVisible, setRelationshipDateEditorVisible] = useState(false);
  const profileScrollOffset = useRef(0);
  const [initialScrollOffset, setInitialScrollOffset] = useState<number>();
  const [scrollOffsetReady, setScrollOffsetReady] = useState(false);

  useEffect(() => {
    const offset = profileScrollOffsetToRestore;
    profileScrollOffsetToRestore = null;

    if (offset !== null) {
      setInitialScrollOffset(offset);
      setScrollOffsetReady(true);
      return;
    }

    let cancelled = false;
    void AsyncStorage.getItem(PROFILE_THEME_SCROLL_STORAGE_KEY)
      .then((storedOffset) => {
        if (cancelled) return;
        const parsedOffset = storedOffset === null ? undefined : Number(storedOffset);
        setInitialScrollOffset(Number.isFinite(parsedOffset) ? parsedOffset : undefined);
        void AsyncStorage.removeItem(PROFILE_THEME_SCROLL_STORAGE_KEY);
      })
      .finally(() => {
        if (!cancelled) setScrollOffsetReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
        message: `Включите уведомления для приложения ${quotedAppName} в настройках телефона.`,
        tone: 'warning',
        actions: [
          { label: 'Открыть настройки', onPress: openSystemSettings },
          { label: 'Отмена', variant: 'ghost' },
        ],
      });
    }
  };

  const changeTheme = async (nextTheme: ThemeName) => {
    if (nextTheme === theme) {
      setThemePickerVisible(false);
      return;
    }

    try {
      setThemeSaving(true);
      profileScrollOffsetToRestore = profileScrollOffset.current;
      await AsyncStorage.setItem(PROFILE_THEME_SCROLL_STORAGE_KEY, String(profileScrollOffset.current));
      await setTheme(nextTheme);
      setThemePickerVisible(false);
    } catch (error) {
      profileScrollOffsetToRestore = null;
      void AsyncStorage.removeItem(PROFILE_THEME_SCROLL_STORAGE_KEY);
      showDialog({
        title: 'Не получилось изменить тему',
        message: error instanceof Error ? error.message : 'Попробуйте ещё раз.',
        tone: 'danger',
      });
    } finally {
      setThemeSaving(false);
    }
  };

  if (!user || !couple || !scrollOffsetReady) {
    return null;
  }

  return (
    <AppScreen
      initialScrollOffset={initialScrollOffset}
      onScrollOffsetChange={(offset) => { profileScrollOffset.current = offset; }}
    >
      <View style={styles.header}>
        <BackButton accessibilityLabel="Назад в Ещё"
          onPress={() => router.canGoBack() ? router.back() : router.replace('/more')} />
        <Text style={styles.title}>Профиль</Text>
      </View>

      <View style={styles.coupleCard}>
        <PairAvatars firstName={user.displayName} secondName={couple.partnerName} size={64} />
        <View style={styles.centeredCopy}>
          <Text style={styles.coupleName}>{user.displayName}{couple.partnerName ? ` + ${couple.partnerName}` : ''}</Text>
          <View style={styles.connectedRow}>
            <AppIcon name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.connected}>{couple.partnerName ? 'Вы связаны' : 'Личное пространство'}</Text>
          </View>
        </View>
      </View>

      {!couple.partnerName && (
        <View style={styles.partnerInvite}>
          <InvitePartnerCallout onPress={() => router.push('/pair')} />
        </View>
      )}
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
              <AppIcon name="heart-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailCopy}>
              <Text style={styles.detailLabel}>Вместе с</Text>
              <Text style={styles.detailValue}>{couple.relationshipStartedAt ? formatRelationshipDate(couple.relationshipStartedAt) : 'Добавить дату'}</Text>
            </View>
            <AppIcon name="chevron-forward" size={20} color={colors.muted} />
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
        <Text style={styles.sectionTitle}>Оформление</Text>
        <View style={styles.detailsCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Тема приложения"
            accessibilityHint="Открыть выбор темы"
            accessibilityState={{ expanded: themePickerVisible }}
            onPress={() => setThemePickerVisible(true)}
            style={({ pressed }) => [styles.detailRow, pressed && styles.pressed]}
          >
            <View style={styles.detailIcon}>
              <AppIcon name="sparkles-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailCopy}>
              <Text style={styles.detailValue}>Тема приложения</Text>
              <Text style={styles.detailLabel}>{themeLabels[theme]}</Text>
            </View>
            <AppIcon name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        </View>
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={themePickerVisible}
        statusBarTranslucent
        onRequestClose={() => {
          if (!themeSaving) setThemePickerVisible(false);
        }}
      >
        <SafeAreaView style={styles.themeModalBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Закрыть выбор темы"
            style={StyleSheet.absoluteFill}
            disabled={themeSaving}
            onPress={() => setThemePickerVisible(false)}
          />
          <View style={styles.themeModalCard}>
            <View style={styles.themeModalHeader}>
              <Text style={styles.themeModalTitle}>Тема приложения</Text>
              <Text style={styles.themeModalSubtitle}>Выберите настроение интерфейса</Text>
            </View>
            <View style={styles.themeRestartNote}>
              <AppIcon name="refresh-outline" size={20} color={colors.secondary} />
              <Text style={styles.themeRestartNoteText}>
                После смены темы приложение перезапустится
              </Text>
            </View>
            <View style={styles.themeOptions}>
              <ThemeOptionButton
                label="Розовая"
                palette={themePalettes.rose}
                selected={theme === 'rose'}
                disabled={themeSaving}
                onPress={() => void changeTheme('rose')}
              />
              <ThemeOptionButton
                label="Изумрудная"
                palette={themePalettes.emerald}
                selected={theme === 'emerald'}
                disabled={themeSaving}
                onPress={() => void changeTheme('emerald')}
              />
              <ThemeOptionButton
                label="Медовая"
                palette={themePalettes.honey}
                selected={theme === 'honey'}
                disabled={themeSaving}
                onPress={() => void changeTheme('honey')}
              />
            </View>
            <AppButton
              label="Отмена"
              variant="ghost"
              disabled={themeSaving}
              onPress={() => setThemePickerVisible(false)}
            />
          </View>
        </SafeAreaView>
      </Modal>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Настройки аккаунта</Text>
        <IntimateQuestionSettings />
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <AppIcon name="notifications-outline" size={20} color={colors.primary} />
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
              <AppIcon name="volume-medium-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailCopy}>
              <Text style={styles.detailValue}>Настройки уведомлений</Text>
              <Text style={styles.detailLabel}>Звук и вибрация настраиваются в системе</Text>
            </View>
            <AppIcon name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
          <View style={styles.separator} />
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Открыть политику конфиденциальности"
            onPress={() => router.push('/privacy' as Href)}
            style={({ pressed }) => [styles.detailRow, pressed && styles.pressed]}
          >
            <View style={styles.detailIcon}>
              <AppIcon name="shield-checkmark-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailCopy}>
              <Text style={styles.detailValue}>Конфиденциальность</Text>
              <Text style={styles.detailLabel}>Обработка и защита ваших данных</Text>
            </View>
            <AppIcon name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        </View>
      </View>

      <View style={styles.logoutButton}>
        <AppButton
          label="Удалить аккаунт и данные"
          variant="dangerOutline"
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
          variant="secondary"
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

const styles = createThemedStyles({
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
  coupleCard: {
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xxl,
  },
  partnerInvite: {
    marginTop: spacing.lg,
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
    backgroundColor: colors.softAccent,
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
  themeModalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.overlay,
  },
  themeModalCard: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
  },
  themeModalHeader: {
    gap: spacing.xs,
  },
  themeModalTitle: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  themeModalSubtitle: {
    ...typography.body,
    color: colors.muted,
  },
  themeRestartNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.softAccent,
  },
  themeRestartNoteText: {
    ...typography.label,
    flex: 1,
    color: colors.secondary,
  },
  themeOptions: {
    gap: spacing.md,
  },
  themeOptionButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
  },
  themeOptionButtonDisabled: {
    opacity: 0.55,
  },
  themeOptionLabel: {
    ...typography.body,
    color: colors.white,
    fontWeight: '700',
  },
});
