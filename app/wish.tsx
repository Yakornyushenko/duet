import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppScreen } from '@/components/AppScreen';
import { useApp } from '@/context/AppContext';
import { useDialog } from '@/context/DialogContext';
import {
  addWishComment,
  deleteWish,
  deleteWishComment,
  getWish,
  getWishPhotoUrls,
  listWishComments,
  pickAndUploadWishPhoto,
  removeDraftWishPhoto,
  updateWish,
  Wish,
  WishComment,
} from '@/services/wishes';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { getWishlists } from '@/utils/wishlists';

const maxPhotos = 3;

export default function WishScreen() {
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const wishId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user, couple } = useApp();
  const { showDialog } = useDialog();
  const wishlists = getWishlists(user, couple);

  const [wish, setWish] = useState<Wish | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fulfilled, setFulfilled] = useState(false);
  const [comments, setComments] = useState<WishComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState(false);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    const controller = new AbortController();
    if (!couple || !wishId) {
      setLoading(false);
      setError(true);
      return;
    }
    setLoading(true);
    setError(false);
    setCommentsLoading(true);
    setCommentsError(false);
    setComments([]);
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
    void listWishComments(wishId, controller.signal).then((items) => {
      if (active) setComments(items);
    }).catch(() => {
      if (active) setCommentsError(true);
    }).finally(() => {
      if (active) setCommentsLoading(false);
    });
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

  const listLabel = wishlists.find((item) => item.value === wish?.list)?.label ?? 'Список';

  const saveWish = async () => {
    if (!couple || !wish || busy || !title.trim()) {
      return;
    }
    setBusy(true);
    try {
      const next = await updateWish(couple.id, wish.id, {
        title,
        description,
        photos,
        fulfilled,
      });
      setWish(next);
      showDialog({
        title: 'Сохранено',
        message: 'Желание обновлено у вас обоих.',
        tone: 'success',
      });
    } catch {
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

  const submitComment = async () => {
    if (!couple || !wish || busy || !comment.trim()) {
      return;
    }
    setBusy(true);
    try {
      const next = await addWishComment(couple.id, wish.id, comment);
      setComments((current) => [...current, next]);
      setComment('');
    } catch {
      showDialog({
        title: 'Не удалось отправить',
        message: 'Комментарий не сохранился. Попробуйте ещё раз.',
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  };

  const removeComment = (item: WishComment) => {
    showDialog({
      title: 'Удалить комментарий?',
      message: 'Его больше не увидит никто из вас.',
      tone: 'warning',
      actions: [
        {
          label: 'Удалить',
          variant: 'danger',
          onPress: async () => {
            try {
              await deleteWishComment(item.id);
              setComments((current) => current.filter((commentItem) => commentItem.id !== item.id));
            } catch {
              showDialog({
                title: 'Не удалось удалить',
                message: 'Попробуйте ещё раз чуть позже.',
                tone: 'danger',
              });
            }
          },
        },
        { label: 'Отмена', variant: 'ghost' },
      ],
    });
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
              router.back();
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
          <Pressable accessibilityRole="button" accessibilityLabel="Назад" onPress={() => router.back()} style={styles.icon}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </Pressable>
          <Text style={styles.heading}>Желание</Text>
        </View>
        <Text style={styles.muted}>Загружаем…</Text>
      </AppScreen>
    );
  }

  if (error || !wish) {
    return (
      <AppScreen>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Назад" onPress={() => router.back()} style={styles.icon}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </Pressable>
          <Text style={styles.heading}>Желание</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.body}>Не удалось открыть желание.</Text>
          <AppButton label="Повторить" onPress={() => setRevision((current) => current + 1)} />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Назад" onPress={() => router.back()} style={styles.icon}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.heading} numberOfLines={1}>Желание</Text>
          <Text style={styles.listLabel} numberOfLines={1}>{listLabel}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <AppInput label="Название" value={title} onChangeText={setTitle} maxLength={200} />
        <AppInput
          label="Описание"
          value={description}
          onChangeText={setDescription}
          maxLength={2000}
          multiline
          style={styles.description}
          placeholder="Всё, что поможет исполнить желание, например ссылки"
        />
        <View style={styles.fulfilledRow}>
          <Text style={styles.body}>Исполнено</Text>
          <Switch
            value={fulfilled}
            onValueChange={setFulfilled}
            trackColor={{ false: colors.border, true: colors.soft }}
            thumbColor={fulfilled ? colors.primary : colors.white}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Фотографии</Text>
        <View style={styles.photos}>
          {photos.map((path) => (
            <View key={path} style={styles.photoFrame}>
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
                  <Ionicons name="image-outline" size={22} color={colors.muted} />
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Удалить фото"
                onPress={() => void removePhoto(path)}
                style={styles.photoRemove}
              >
                <Ionicons name="close" size={16} color={colors.white} />
              </Pressable>
            </View>
          ))}
          {photos.length < maxPhotos ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Добавить фото"
              disabled={busy}
              onPress={() => void addPhoto()}
              style={styles.addPhoto}
            >
              <Ionicons name="camera-outline" size={24} color={colors.primary} />
              <Text style={styles.addPhotoLabel}>Добавить</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

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
          <View style={styles.previewCard} pointerEvents="box-none">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Закрыть"
              onPress={() => setPreviewUrl(null)}
              style={styles.previewClose}
            >
              <Ionicons name="close" size={22} color={colors.white} />
            </Pressable>
            {isFocused && previewUrl ? (
              <Image source={{ uri: previewUrl }} style={styles.previewImage} resizeMode="contain" resizeMethod="resize" />
            ) : null}
          </View>
        </SafeAreaView>
      </Modal>

      <AppButton label="Сохранить" loading={busy} disabled={!title.trim()} onPress={() => void saveWish()} />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Комментарии</Text>
        {commentsLoading ? (
          <Text style={styles.muted}>Загружаем комментарии…</Text>
        ) : commentsError ? (
          <Text style={styles.muted}>Не удалось загрузить комментарии. Откройте желание ещё раз, чтобы повторить.</Text>
        ) : !comments.length ? (
          <Text style={styles.muted}>Оставьте первую заметку для партнёра.</Text>
        ) : (
          comments.map((item) => (
            <View key={item.id} style={styles.comment}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentAuthor}>{item.authorName}</Text>
                {item.authorId === user?.id ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Удалить комментарий" onPress={() => removeComment(item)}>
                    <Text style={styles.deleteLink}>Удалить</Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          ))
        )}
        <AppInput
          label="Новый комментарий"
          value={comment}
          onChangeText={setComment}
          maxLength={1000}
          multiline
          style={styles.commentInput}
          placeholder="Идея, вопрос или уточнение"
        />
        <AppButton
          label="Отправить"
          variant="secondary"
          disabled={!comment.trim() || commentsLoading}
          loading={busy}
          onPress={() => void submitComment()}
        />
      </View>

      <AppButton label="Удалить желание" variant="danger" disabled={busy} onPress={confirmDelete} />
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
  icon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.softRose,
  },
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
  description: {
    minHeight: 110,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    textAlignVertical: 'top',
  },
  fulfilledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  photos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  photoFrame: {
    width: 96,
    height: 96,
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
    width: 96,
    height: 96,
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
    maxWidth: 480,
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
  comment: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  commentAuthor: { ...typography.label, color: colors.secondary },
  deleteLink: { ...typography.caption, color: colors.danger },
  commentInput: {
    minHeight: 84,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    textAlignVertical: 'top',
  },
});
