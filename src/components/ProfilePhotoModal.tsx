import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { PairAvatars } from '@/components/PairAvatars';
import { useApp } from '@/context/AppContext';
import { useDialog } from '@/context/DialogContext';
import { pickAndUploadProfilePhoto, removeProfilePhoto } from '@/services/profilePhotos';
import { colors, createThemedStyles, radii, spacing } from '@/theme/tokens';

type ProfilePhotoModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function ProfilePhotoModal({ visible, onClose }: ProfilePhotoModalProps) {
  const { user, updateProfilePhoto } = useApp();
  const { showDialog } = useDialog();
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const choosePhoto = async () => {
    let uploadedPath: string | null = null;
    try {
      setSaving(true);
      uploadedPath = await pickAndUploadProfilePhoto(user.id);
      if (!uploadedPath) return;
      const previousPath = user.avatarPath;
      await updateProfilePhoto(uploadedPath);
      if (previousPath) {
        void removeProfilePhoto(previousPath).catch((error) =>
          console.warn('Не удалось удалить предыдущее фото профиля', error));
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      if (uploadedPath) {
        void removeProfilePhoto(uploadedPath).catch(() => undefined);
      }
      showDialog({
        title: 'Не получилось сохранить фото',
        message: error instanceof Error ? error.message : 'Попробуйте ещё раз.',
        tone: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmRemoval = () => {
    if (!user.avatarPath) return;
    const path = user.avatarPath;
    onClose();
    showDialog({
      title: 'Удалить фото профиля?',
      message: 'Вместо фото снова будет показываться первая буква имени.',
      tone: 'warning',
      actions: [
        {
          label: 'Удалить',
          variant: 'danger',
          onPress: async () => {
            try {
              setSaving(true);
              await updateProfilePhoto(null);
              await removeProfilePhoto(path).catch((error) =>
                console.warn('Не удалось удалить файл фото профиля', error));
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              showDialog({
                title: 'Не получилось удалить фото',
                message: error instanceof Error ? error.message : 'Попробуйте ещё раз.',
                tone: 'danger',
              });
            } finally {
              setSaving(false);
            }
          },
        },
        { label: 'Отмена', variant: 'ghost' },
      ],
    });
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
      onRequestClose={() => {
        if (!saving) onClose();
      }}
    >
      <SafeAreaView style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Закрыть настройку фото профиля"
          style={StyleSheet.absoluteFill}
          disabled={saving}
          onPress={onClose}
        />
        <View style={styles.card}>
          <View style={styles.preview}>
            <PairAvatars firstName={user.displayName} firstPhotoUrl={user.avatarUrl} size={88} />
          </View>
          <AppButton
            label={user.avatarPath ? 'Выбрать другое фото' : 'Добавить фото'}
            onPress={() => void choosePhoto()}
            loading={saving}
          />
          {user.avatarPath ? (
            <AppButton
              label="Удалить фото"
              onPress={confirmRemoval}
              disabled={saving}
              variant="dangerOutline"
            />
          ) : null}
          <AppButton label="Отмена" variant="ghost" disabled={saving} onPress={onClose} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = createThemedStyles({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.overlay,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
  },
  preview: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});
