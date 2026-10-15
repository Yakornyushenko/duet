import { AppIcon } from '@/components/AppIcon';
import { Href, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  BackHandler,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { BackButton } from '@/components/BackButton';
import { EntityIconPicker } from '@/components/EntityIconPicker';
import { EntityIcon } from '@/types/domain';
import { AppScreen } from '@/components/AppScreen';
import { useApp } from '@/context/AppContext';
import { useDialog } from '@/context/DialogContext';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import {
  createWish,
  deleteWish,
  getWish,
  getWishPhotoUrls,
  pickAndUploadWishPhoto,
  removeDraftWishPhoto,
  updateWish,
  Wish,
} from '@/services/wishes';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { canManageWishlist, getWishlists } from '@/utils/wishlists';

const maxPhotos = 1;
const titleInputMinHeight = 52;

function getTitleInputHeight(value: string, width: number) {
  const charactersPerLine = Math.max(12, Math.floor(width / 8.5));
  const lines = value.split('\n').reduce(
    (total, line) => total + Math.max(1, Math.ceil(line.length / charactersPerLine)),
    0,
  );
  return Math.max(titleInputMinHeight, spacing.md * 2 + lines * typography.body.lineHeight);
}

export function WishEditorScreen() {
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{ id?: string | string[]; list?: string | string[] }>();
  const wishId = Array.isArray(params.id) ? params.id[0] : params.id;
  const requestedList = Array.isArray(params.list) ? params.list[0] : params.list;
  const isCreating = !wishId;
  const { user, couple } = useApp();
  const { showDialog } = useDialog();
  const { width } = useWindowDimensions();
  const { contentMaxWidth, horizontalPadding, largeModalMaxWidth, mediaThumbnailSize } = useResponsiveLayout();
  const wishlists = getWishlists(user, couple);

  const [wish, setWish] = useState<Wish | null>(null);
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState<EntityIcon>('sparkles');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fulfilled, setFulfilled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    const controller = new AbortController();
    if (!couple) {
      setLoading(false);
      setError(true);
      return;
    }
    if (isCreating) {
      setLoading(false);
      setError(false);
      return;
    }
    setLoading(true);
    setError(false);
    const loadWish = async () => {
      try {
      const nextWish = await getWish(couple.id, wishId, controller.signal);
      if (!active) return;
      if (!nextWish) {
        setError(true);
        setWish(null);
        return;
      }
      setWish(nextWish);
      setTitle(nextWish.title);
      setIcon(nextWish.icon);
      setDescription(nextWish.description);
      setPhotos(nextWish.photos);
      setFulfilled(nextWish.fulfilled);
      setError(false);
    } catch {
      if (active) setError(true);
    } finally {
      if (active) setLoading(false);
    }
    };

    void loadWish();
    return () => {
      active = false;
      controller.abort();
    };
  }, [couple?.id, wishId, revision]));

  useEffect(() => {
    if (!isFocused) return;
    let active = true;
    // Signed photo URLs are optional content, not a prerequisite for opening.
    void getWishPhotoUrls(photos).then((urls) => {
      if (active) setPhotoUrls(urls);
    }).catch(() => {
      // Keep placeholders; a photo failure must not hide the wish's text.
    });
    return () => { active = false; };
  }, [photos, isFocused]);

  const list = wish?.list
    ?? wishlists.find((item) => item.value === requestedList)?.value
    ?? wishlists[0]?.value
    ?? 'together';
  const listLabel = wishlists.find((item) => item.value === list)?.label ?? 'Список';
  const canEdit = canManageWishlist(user, couple, list);
  const titleInputWidth = Math.min(width, contentMaxWidth) - horizontalPadding * 2 - spacing.lg * 4;
  const titleInputHeight = getTitleInputHeight(title, titleInputWidth);
  const hasUnsavedChanges = isCreating
    ? title !== '' || icon !== 'sparkles' || description !== '' || photos.length > 0 || fulfilled
    : Boolean(wish && (
      title !== wish.title
      || icon !== wish.icon
      || description !== wish.description
      || fulfilled !== wish.fulfilled
      || photos.length !== wish.photos.length
      || photos.some((path, index) => path !== wish.photos[index])
    ));

  const leaveWish = useCallback(async () => {
    const savedPhotos = new Set(wish?.photos ?? []);
    await Promise.allSettled(
      photos.filter((path) => !savedPhotos.has(path)).map(removeDraftWishPhoto),
    );
    router.back();
  }, [photos, wish?.photos]);

  const handleBack = useCallback(() => {
    if (busy) {
      return;
    }
    if (!hasUnsavedChanges) {
      router.back();
      return;
    }
    showDialog({
      title: 'Выйти без сохранения?',
      message: isCreating
        ? 'Если выйти сейчас, новое желание не сохранится.'
        : 'Если выйти сейчас, изменения в желании не сохранятся.',
      tone: 'warning',
      dismissible: false,
      actions: [
        { label: 'Продолжить редактирование', variant: 'secondary' },
        { label: 'Выйти без сохранения', variant: 'danger', onPress: leaveWish },
      ],
    });
  }, [busy, hasUnsavedChanges, isCreating, leaveWish, showDialog]);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => subscription.remove();
  }, [handleBack]));

  const saveWish = async () => {
    if (!couple || busy || !title.trim() || (!isCreating && !wish)) {
      return;
    }
    setBusy(true);
    try {
      const savedWish = isCreating
        ? await createWish(couple.id, { title, description, photos, fulfilled, icon, list })
        : await updateWish(couple.id, wish!.id, { title, description, photos, fulfilled, icon });
      if (isCreating) {
        router.replace(`/wish?id=${savedWish.id}` as Href);
      } else {
        router.back();
      }
    } catch (saveError) {
      console.warn('Не удалось сохранить желание', saveError);
      showDialog({
        title: 'Не получилось сохранить',
        message: 'Проверьте подключение и попробуйте ещё раз.',
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  };

  const addPhoto = async () => {
    if (!couple || !user || busy || photos.length >= maxPhotos) {
      return;
    }
    setBusy(true);
    try {
      const path = await pickAndUploadWishPhoto(couple.id, user.id);
      setPhotos((current) => [...current, path]);
    } catch (uploadError) {
      if (uploadError instanceof Error && uploadError.message === 'CANCELLED') {
        return;
      }
      showDialog({
        title: 'Не удалось добавить фото',
        message: uploadError instanceof Error && uploadError.message === 'Нужен доступ к фотографиям'
          ? 'Разрешите доступ к галерее в настройках телефона.'
          : 'Проверьте подключение и попробуйте ещё раз.',
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = async (path: string) => {
    if (busy) {
      return;
    }
    const wasSaved = wish?.photos.includes(path);
    setPhotos((current) => current.filter((item) => item !== path));
    setPhotoUrls((current) => {
      const next = { ...current };
      delete next[path];
      return next;
    });
    if (!wasSaved) {
      try {
        await removeDraftWishPhoto(path);
      } catch {
        // Draft cleanup is best-effort; save will keep the wish consistent.
      }
    }
  };

  const confirmDelete = () => {
    if (!couple || !wish) {
      return;
    }
    showDialog({
      title: 'Удалить желание?',
      message: 'Оно исчезнет из списка у вас обоих.',
      tone: 'warning',
      actions: [
        {
          label: 'Удалить',
          variant: 'danger',
          onPress: async () => {
            setBusy(true);
            try {
              await deleteWish(couple.id, wish.id);
              router.dismissTo(`/wishlists?list=${list}` as Href);
            } catch {
              showDialog({
                title: 'Не удалось удалить',
                message: 'Проверьте подключение и попробуйте ещё раз.',
                tone: 'danger',
              });
            } finally {
              setBusy(false);
            }
          },
        },
        { label: 'Отмена', variant: 'ghost' },
      ],
    });
  };

  if (loading) {
    return (
      <AppScreen>
        <View style={styles.header}>
          <BackButton onPress={handleBack} />
          <Text style={styles.heading}>Желание</Text>
        </View>
        <Text style={styles.muted}>Загружаем…</Text>
      </AppScreen>
    );
  }

  if (error || (!isCreating && !wish)) {
    return (
      <AppScreen>
        <View style={styles.header}>
          <BackButton onPress={handleBack} />
          <Text style={styles.heading}>{isCreating ? 'Новое желание' : 'Желание'}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.body}>Не удалось открыть желание.</Text>
          <AppButton label="Повторить" onPress={() => setRevision((current) => current + 1)} />
        </View>
      </AppScreen>
    );
  }

  if (!canEdit) {
    return (
      <AppScreen>
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.heading}>Редактирование</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.body}>Желания в личном списке партнёра можно только просматривать и комментировать.</Text>
          {wishId ? <AppButton label="Открыть желание" onPress={() => router.replace(`/wish?id=${wishId}` as Href)} /> : null}
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <BackButton onPress={handleBack} disabled={busy} />
        <View style={styles.headerCopy}>
          <Text style={styles.heading} numberOfLines={1}>{isCreating ? 'Новое желание' : 'Редактирование'}</Text>
          <Text style={styles.listLabel} numberOfLines={1}>{listLabel}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <AppInput
          label="Название"
          value={title}
          onChangeText={setTitle}
          maxLength={200}
          multiline
          textAlignVertical="top"
          style={[styles.titleInput, { height: titleInputHeight }]}
        />
        <EntityIconPicker kind="wish" value={icon} onChange={setIcon} disabled={busy} />
        <AppInput
          label="Описание"
          value={description}
          onChangeText={setDescription}
          maxLength={2000}
          multiline
          style={styles.description}
          placeholder="Всё, что поможет исполнить желание, например ссылки"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Фотографии</Text>
        <View style={styles.photos}>
          {photos.map((path) => (
            <View key={path} style={[styles.photoFrame, { width: mediaThumbnailSize, height: mediaThumbnailSize }]}>
              {isFocused && photoUrls[path] ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Открыть фото"
                  onPress={() => setPreviewUrl(photoUrls[path])}
                  style={styles.photo}
                >
                  <Image source={{ uri: photoUrls[path] }} style={styles.photo} resizeMethod="resize" />
                </Pressable>
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder]}>
                  <AppIcon name="image-outline" size={22} color={colors.muted} />
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Удалить фото"
                onPress={() => void removePhoto(path)}
                style={styles.photoRemove}
              >
                <AppIcon name="close" size={16} color={colors.white} />
              </Pressable>
            </View>
          ))}
          {photos.length < maxPhotos ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Добавить фото"
              disabled={busy}
              onPress={() => void addPhoto()}
              style={[styles.addPhoto, { width: mediaThumbnailSize, height: mediaThumbnailSize }]}
            >
              <AppIcon name="camera-outline" size={24} color={colors.primary} />
              <Text style={styles.addPhotoLabel}>Добавить</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {!isCreating ? (
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel={`Статус желания: ${fulfilled ? 'исполнено' : 'не исполнено'}`}
          accessibilityHint="Изменить статус желания"
          accessibilityState={{ checked: fulfilled, disabled: busy }}
          disabled={busy}
          onPress={() => setFulfilled((current) => !current)}
          style={({ pressed }) => [
            styles.statusCard,
            fulfilled && styles.statusCardFulfilled,
            pressed && styles.statusCardPressed,
            busy && styles.statusCardDisabled,
          ]}
        >
          <AppIcon
            name={fulfilled ? 'checkmark-circle' : 'ellipse-outline'}
            size={28}
            color={fulfilled ? colors.primary : colors.secondary}
          />
          <View style={styles.statusCopy}>
            <Text style={styles.statusLabel}>Статус желания</Text>
            <Text style={[styles.statusValue, fulfilled && styles.statusValueFulfilled]}>
              {fulfilled ? 'Исполнено' : 'Не исполнено'}
            </Text>
          </View>
          <Switch
            value={fulfilled}
            pointerEvents="none"
            accessible={false}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </Pressable>
      ) : null}

      <Modal
        transparent
        animationType="fade"
        visible={isFocused && Boolean(previewUrl)}
        statusBarTranslucent
        onRequestClose={() => setPreviewUrl(null)}
      >
        <SafeAreaView style={styles.previewBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Закрыть фото"
            style={StyleSheet.absoluteFill}
            onPress={() => setPreviewUrl(null)}
          />
          <View style={[styles.previewCard, { maxWidth: largeModalMaxWidth }]} pointerEvents="box-none">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Закрыть"
              onPress={() => setPreviewUrl(null)}
              style={styles.previewClose}
            >
              <AppIcon name="close" size={22} color={colors.white} />
            </Pressable>
            {isFocused && previewUrl ? (
              <Image source={{ uri: previewUrl }} style={styles.previewImage} resizeMode="contain" resizeMethod="resize" />
            ) : null}
          </View>
        </SafeAreaView>
      </Modal>

      <AppButton label="Сохранить" loading={busy} disabled={!title.trim()} onPress={() => void saveWish()} />

      {!isCreating ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Удалить желание"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={confirmDelete}
          style={({ pressed }) => [
            styles.deleteAction,
            pressed && styles.deleteActionPressed,
            busy && styles.deleteActionDisabled,
          ]}
        >
          <AppIcon name="trash-outline" size={18} color={colors.danger} />
          <Text style={styles.deleteActionText}>Удалить желание</Text>
        </Pressable>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  heading: { ...typography.sectionTitle, color: colors.text },
  listLabel: { ...typography.caption, color: colors.muted, marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.cardTitle, color: colors.text },
  body: { ...typography.body, color: colors.text },
  muted: { ...typography.body, color: colors.muted },
  titleInput: { lineHeight: typography.body.lineHeight, paddingTop: spacing.md, paddingBottom: spacing.md },
  description: {
    minHeight: 110,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    textAlignVertical: 'top',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.softRose,
  },
  statusCardFulfilled: { backgroundColor: colors.soft },
  statusCardPressed: { opacity: 0.78 },
  statusCardDisabled: { opacity: 0.5 },
  statusCopy: { flex: 1, gap: spacing.xs },
  statusLabel: { ...typography.caption, color: colors.muted },
  statusValue: { ...typography.cardTitle, color: colors.secondary },
  statusValueFulfilled: { color: colors.primary },
  photos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  photoFrame: {
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.softRose,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
  addPhoto: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.softRose,
  },
  addPhotoLabel: { ...typography.caption, color: colors.primary, fontWeight: '500' },
  previewBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  previewCard: {
    width: '100%',
    alignSelf: 'center',
    aspectRatio: 1,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.text,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewClose: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
  deleteAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  deleteActionPressed: { opacity: 0.6 },
  deleteActionDisabled: { opacity: 0.45 },
  deleteActionText: { ...typography.caption, color: colors.danger },
});
