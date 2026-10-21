import { AppIcon, type AppIconName } from '@/components/AppIcon';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppScreen } from '@/components/AppScreen';
import { BackButton } from '@/components/BackButton';
import { useApp } from '@/context/AppContext';
import { useDialog } from '@/context/DialogContext';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import {
  addWishComment,
  deleteWishComment,
  getWish,
  getWishPhotoUrls,
  listWishComments,
  updateWishComment,
  updateWish,
  Wish,
  WishComment,
} from '@/services/wishes';
import { colors, createThemedStyles, radii, shadow, spacing, typography } from '@/theme/tokens';
import { entityIcons } from '@/utils/entityIcons';
import { canManageWishlist, getWishlists } from '@/utils/wishlists';
import { Href, router, useFocusEffect, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WishScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const wishId = Array.isArray(params.id) ? params.id[0] : params.id;
  const isFocused = useIsFocused();
  const { user, couple } = useApp();
  const { showDialog } = useDialog();
  const { largeModalMaxWidth } = useResponsiveLayout();
  const [wish, setWish] = useState<Wish | null>(null);
  const [comments, setComments] = useState<WishComment[]>([]);
  const [comment, setComment] = useState('');
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState(false);
  const [commentMutationId, setCommentMutationId] = useState<string | null>(null);
  const [commentMenuId, setCommentMenuId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
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
    void getWish(couple.id, wishId, controller.signal).then((nextWish) => {
      if (!active) return;
      setWish(nextWish);
      setError(!nextWish);
    }).catch(() => {
      if (active) setError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
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
    if (!isFocused || !wish?.photos.length) {
      setPhotoUrls({});
      return;
    }
    let active = true;
    void getWishPhotoUrls(wish.photos).then((urls) => {
      if (active) setPhotoUrls(urls);
    }).catch(() => {});
    return () => { active = false; };
  }, [isFocused, wish?.photos]);

  const submitComment = async () => {
    if (!couple || !wish || commentMutationId || editingCommentId || !comment.trim()) return;
    setCommentMutationId('new');
    try {
      const next = await addWishComment(couple.id, wish.id, comment, replyingToId);
      setComments((current) => [...current, next]);
      setComment('');
      setReplyingToId(null);
    } catch {
      showDialog({ title: 'Не удалось отправить', message: 'Комментарий не сохранился. Попробуйте ещё раз.', tone: 'danger' });
    } finally {
      setCommentMutationId(null);
    }
  };

  const startEditingComment = (item: WishComment) => {
    if (commentMutationId) return;
    setCommentMenuId(null);
    setReplyingToId(null);
    setEditingCommentId(item.id);
    setEditingComment(item.body);
  };

  const cancelEditingComment = () => {
    if (commentMutationId) return;
    setEditingCommentId(null);
    setEditingComment('');
  };

  const saveComment = async (item: WishComment) => {
    const body = editingComment.trim();
    if (!body || commentMutationId) return;
    if (body === item.body) {
      cancelEditingComment();
      return;
    }
    setCommentMutationId(item.id);
    try {
      const updated = await updateWishComment(item.id, item.wishId, body);
      setComments((current) => current.map((commentItem) =>
        commentItem.id === updated.id ? updated : commentItem));
      setEditingCommentId(null);
      setEditingComment('');
    } catch {
      showDialog({ title: 'Не удалось изменить комментарий', message: 'Проверьте подключение и попробуйте ещё раз.', tone: 'danger' });
    } finally {
      setCommentMutationId(null);
    }
  };

  const removeComment = (item: WishComment) => {
    if (commentMutationId) return;
    setCommentMenuId(null);
    showDialog({
      title: 'Удалить комментарий?',
      message: 'Его больше не увидит никто из вас.',
      tone: 'warning',
      actions: [
        { label: 'Удалить', variant: 'danger', onPress: async () => {
          setCommentMutationId(item.id);
          try {
            await deleteWishComment(item.id, item.wishId);
            setComments((current) => current.filter((commentItem) => commentItem.id !== item.id)
              .map((commentItem) => commentItem.replyToId === item.id ? { ...commentItem, replyToId: null } : commentItem));
            setReplyingToId((current) => current === item.id ? null : current);
          } catch {
            showDialog({ title: 'Не удалось удалить', message: 'Попробуйте ещё раз чуть позже.', tone: 'danger' });
          } finally {
            setCommentMutationId(null);
          }
        } },
        { label: 'Отмена', variant: 'ghost' },
      ],
    });
  };

  const startReply = (item: WishComment) => {
    if (commentMutationId) return;
    setCommentMenuId(null);
    setEditingCommentId(null);
    setEditingComment('');
    setReplyingToId(item.id);
  };

  const toggleFulfilled = async () => {
    if (!couple || !wish || busy || !canManageWishlist(user, couple, wish.list)) return;
    setBusy(true);
    try {
      const updated = await updateWish(couple.id, wish.id, { fulfilled: !wish.fulfilled });
      setWish(updated);
    } catch {
      showDialog({
        title: 'Не удалось изменить статус',
        message: 'Проверьте подключение и попробуйте ещё раз.',
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <AppScreen><View style={styles.header}>
      <BackButton onPress={() => router.back()} />
      <Text style={styles.heading}>Желание</Text>
    </View><Text style={styles.muted}>Загружаем…</Text></AppScreen>;
  }

  if (error || !wish) {
    return <AppScreen><View style={styles.header}>
      <BackButton onPress={() => router.back()} />
      <Text style={styles.heading}>Желание</Text>
    </View><View style={styles.card}>
      <Text style={styles.body}>Не удалось открыть желание.</Text>
      <AppButton label="Повторить" onPress={() => setRevision((current) => current + 1)} />
    </View></AppScreen>;
  }

  const listLabel = getWishlists(user, couple).find((item) => item.value === wish.list)?.label ?? 'Список';
  const canEdit = canManageWishlist(user, couple, wish.list);
  const photoUrl = wish.photos[0] ? photoUrls[wish.photos[0]] : undefined;
  const replyingTo = comments.find((item) => item.id === replyingToId);

  return (
    <AppScreen>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <View style={styles.headerCopy}>
          <Text style={styles.heading}>Желание</Text>
          <Text style={styles.listLabel}>{listLabel}</Text>
        </View>
        {canEdit ? <Pressable
          accessibilityRole="button"
          accessibilityLabel="Редактировать желание"
          onPress={() => router.push(`/wish-edit?id=${wish.id}` as Href)}
          style={styles.iconButton}
        >
          <AppIcon name="create-outline" size={28} color={colors.primary} />
        </Pressable> : null}
      </View>

      <View style={styles.card}>
        <View style={styles.titleRow}>
          <View style={styles.wishIcon}>
            <AppIcon name={entityIcons[wish.icon] ?? entityIcons.sparkles} size={26} color={colors.primary} />
          </View>
          <Text style={styles.title}>{wish.title}</Text>
        </View>
        {wish.description.trim() ? <Text style={styles.body}>{wish.description}</Text> : null}
      </View>

      {wish.photos.length ? <View style={styles.card}>
        <Text style={styles.sectionTitle}>Фотография</Text>
        {photoUrl ? <Pressable accessibilityRole="button" accessibilityLabel="Открыть фото" onPress={() => setPreviewUrl(photoUrl)}>
          <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" resizeMethod="resize" />
        </Pressable> : <View style={[styles.photo, styles.photoPlaceholder]}>
          <AppIcon name="image-outline" size={28} color={colors.muted} />
        </View>}
      </View> : null}

      <Pressable
        accessibilityRole={canEdit ? 'switch' : undefined}
        accessibilityLabel={`Статус желания: ${wish.fulfilled ? 'исполнено' : 'не исполнено'}`}
        accessibilityHint={canEdit ? 'Изменить статус желания' : undefined}
        accessibilityState={{ checked: wish.fulfilled, disabled: !canEdit || busy }}
        disabled={!canEdit || busy}
        onPress={() => void toggleFulfilled()}
        style={({ pressed }) => [
          styles.statusCard,
          wish.fulfilled && styles.statusCardFulfilled,
          !canEdit && !wish.fulfilled && styles.statusCardReadOnly,
          pressed && canEdit && styles.statusCardPressed,
          busy && styles.statusCardDisabled,
        ]}
      >
        <AppIcon name={wish.fulfilled ? 'checkmark-circle' : 'ellipse-outline'} size={28}
          color={wish.fulfilled ? colors.primary : canEdit ? colors.secondary : colors.muted} />
        <View style={styles.statusCopy}>
          <Text style={styles.statusLabel}>Статус желания</Text>
          <Text style={[styles.statusValue, wish.fulfilled && styles.statusValueFulfilled,
            !canEdit && !wish.fulfilled && styles.statusValueReadOnly]}>
            {wish.fulfilled ? 'Исполнено' : 'Не исполнено'}
          </Text>
        </View>
      </Pressable>

      <View style={[styles.card, styles.commentsCard]}>
        <View style={styles.commentsHeader}>
          <Text style={styles.sectionTitle}>Комментарии</Text>
          {!commentsLoading && !commentsError ? <Text style={styles.commentCount}>{comments.length}</Text> : null}
        </View>

        {commentsLoading ? <View style={styles.commentsState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>Загружаем комментарии…</Text>
        </View> : commentsError ? <View style={styles.commentsState}>
          <Text style={styles.muted}>Не удалось загрузить комментарии.</Text>
          <Pressable accessibilityRole="button" onPress={() => setRevision((current) => current + 1)}>
            <Text style={styles.retryLink}>Попробовать снова</Text>
          </Pressable>
        </View> : !comments.length ? <Text style={styles.muted}>Пока нет комментариев.</Text>
          : <View style={styles.commentsList}>
          {comments.map((item, index) => <WishCommentItem
            key={item.id}
            item={item}
            own={item.authorId === user?.id}
            replyTo={comments.find((candidate) => candidate.id === item.replyToId)}
            last={index === comments.length - 1}
            editing={editingCommentId === item.id}
            menuOpen={commentMenuId === item.id}
            draft={editingComment}
            busy={commentMutationId === item.id}
            onDraftChange={setEditingComment}
            onReply={() => startReply(item)}
            onToggleMenu={() => setCommentMenuId((current) => current === item.id ? null : item.id)}
            onEdit={() => startEditingComment(item)}
            onCancel={cancelEditingComment}
            onSave={() => void saveComment(item)}
            onDelete={() => removeComment(item)}
          />)}
        </View>}

        {replyingTo ? <View style={styles.replyComposerContext}>
          <View style={styles.replyComposerCopy}>
            <Text style={styles.replyComposerAuthor}>Ответ для {replyingTo.authorId === user?.id ? 'себя' : replyingTo.authorName}</Text>
            <Text style={styles.replyComposerText} numberOfLines={1}>{replyingTo.body}</Text>
          </View>
          <CommentIconButton label="Отменить ответ" icon="close" onPress={() => setReplyingToId(null)} />
        </View> : null}
        <AppInput label="" value={comment} onChangeText={setComment} maxLength={1000}
          editable={!commentsLoading && !commentsError && !editingCommentId && !commentMutationId}
          multiline style={styles.commentInput} placeholder={editingCommentId ? 'Сначала завершите редактирование' : 'Ваш комментарий'}
          rightElement={<CommentIconButton label="Отправить комментарий" icon="send" tone="primary"
            loading={commentMutationId === 'new'}
            disabled={!comment.trim() || commentsLoading || commentsError || Boolean(editingCommentId) || Boolean(commentMutationId)}
            onPress={() => void submitComment()} />} />
      </View>

      <Modal transparent animationType="fade" visible={isFocused && Boolean(previewUrl)} statusBarTranslucent
        onRequestClose={() => setPreviewUrl(null)}>
        <SafeAreaView style={styles.previewBackdrop}>
          <Pressable accessibilityRole="button" accessibilityLabel="Закрыть фото" style={StyleSheet.absoluteFill}
            onPress={() => setPreviewUrl(null)} />
          <View style={[styles.previewCard, { maxWidth: largeModalMaxWidth }]} pointerEvents="box-none">
            <Pressable accessibilityRole="button" accessibilityLabel="Закрыть" onPress={() => setPreviewUrl(null)} style={styles.previewClose}>
              <AppIcon name="close" size={22} color={colors.white} />
            </Pressable>
            {isFocused && previewUrl ? <Image source={{ uri: previewUrl }} style={styles.previewImage} resizeMode="contain" resizeMethod="resize" /> : null}
          </View>
        </SafeAreaView>
      </Modal>
    </AppScreen>
  );
}

function formatCommentTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const daysAgo = Math.round((today - dateDay) / 86_400_000);
  if (daysAgo === 0) return `Сегодня, ${time}`;
  if (daysAgo === 1) return `Вчера, ${time}`;
  return `${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}, ${time}`;
}

function WishCommentItem({ item, replyTo, own, last, editing, menuOpen, draft, busy, onDraftChange,
  onReply, onToggleMenu, onEdit, onCancel, onSave, onDelete }: {
  item: WishComment;
  replyTo?: WishComment;
  own: boolean;
  last: boolean;
  editing: boolean;
  menuOpen: boolean;
  draft: string;
  busy: boolean;
  onDraftChange: (value: string) => void;
  onReply: () => void;
  onToggleMenu: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  return <View style={[styles.commentItem, !last && styles.commentItemDivider, menuOpen && styles.commentItemMenuOpen]}>
    <Text style={styles.commentAuthor}>{own ? 'Вы' : item.authorName}</Text>
    {replyTo ? <View style={styles.replyReference}>
      <Text style={styles.replyReferenceAuthor}>{replyTo.authorId === item.authorId ? 'Свой комментарий' : replyTo.authorName}</Text>
      <Text style={styles.replyReferenceText} numberOfLines={1}>{replyTo.body}</Text>
    </View> : null}
    {editing ? <>
      <AppInput label="" value={draft} onChangeText={onDraftChange} maxLength={1000} autoFocus
        editable={!busy} multiline style={styles.editCommentInput} />
      <View style={styles.editCommentFooter}>
        <Text style={styles.commentCounter}>{draft.length}/1000</Text>
        <View style={styles.commentActions}>
          <CommentIconButton label="Отменить редактирование" icon="close" disabled={busy} onPress={onCancel} />
          <CommentIconButton label="Сохранить комментарий" icon="checkmark" tone="confirm"
            loading={busy} disabled={!draft.trim() || busy} onPress={onSave} />
        </View>
      </View>
    </> : <Text style={styles.commentBody}>{item.body}</Text>}
    <View style={styles.commentFooter}>
      <Text style={styles.commentTime}>{formatCommentTime(item.createdAt)}</Text>
      {!editing ? <Pressable accessibilityRole="button" accessibilityLabel={`Ответить ${own ? 'на свой комментарий' : item.authorName}`}
        disabled={busy} onPress={onReply} style={({ pressed }) => [styles.commentFooterButton, pressed && styles.commentFooterButtonPressed]}>
        <AppIcon name="arrow-undo-outline" size={17} color={colors.muted} />
      </Pressable> : null}
      <View style={styles.commentFooterSpacer} />
      {own && !editing ? <View style={styles.commentMenuAnchor}>
        <Pressable accessibilityRole="button" accessibilityLabel="Действия с комментарием" accessibilityState={{ expanded: menuOpen }}
          disabled={busy} onPress={onToggleMenu} style={({ pressed }) => [styles.commentFooterButton, pressed && styles.commentFooterButtonPressed]}>
          {busy ? <ActivityIndicator size="small" color={colors.muted} />
            : <AppIcon name="ellipsis-horizontal" size={19} color={colors.muted} />}
        </Pressable>
        {menuOpen ? <View style={styles.commentMenu}>
          <Pressable accessibilityRole="button" onPress={onEdit} style={({ pressed }) => [styles.commentMenuAction, pressed && styles.commentMenuActionPressed]}>
            <AppIcon name="pencil-outline" size={17} color={colors.secondary} />
            <Text style={styles.commentMenuText}>Редактировать</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onDelete} style={({ pressed }) => [styles.commentMenuAction, pressed && styles.commentMenuActionPressed]}>
            <AppIcon name="trash-outline" size={17} color={colors.danger} />
            <Text style={styles.commentMenuDanger}>Удалить</Text>
          </Pressable>
        </View> : null}
      </View> : null}
    </View>
  </View>;
}

function CommentIconButton({ label, icon, tone = 'neutral', loading = false, disabled = false, onPress }: {
  label: string;
  icon: AppIconName;
  tone?: 'neutral' | 'primary' | 'danger' | 'confirm';
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const color = tone === 'primary' ? colors.onPrimary
    : tone === 'danger' ? colors.danger
      : tone === 'confirm' ? colors.success : colors.secondary;
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ disabled: disabled || loading, busy: loading }}
    disabled={disabled || loading} onPress={onPress}
    style={({ pressed }) => [styles.commentIconButton, tone === 'primary' && styles.commentIconButtonPrimary,
      tone === 'danger' && styles.commentIconButtonDanger, tone === 'confirm' && styles.commentIconButtonConfirm,
      pressed && styles.commentIconButtonPressed, (disabled || loading) && styles.commentIconButtonDisabled]}>
    {loading ? <ActivityIndicator size="small" color={color} /> : <AppIcon name={icon} size={tone === 'primary' ? 20 : 18} color={color} />}
  </Pressable>;
}

const styles = createThemedStyles({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  headerCopy: { flex: 1, minWidth: 0 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    borderRadius: radii.md, backgroundColor: colors.softAccent },
  heading: { ...typography.sectionTitle, color: colors.text },
  listLabel: { ...typography.caption, color: colors.muted, marginTop: 2 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg,
    gap: spacing.md, marginBottom: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  wishIcon: { width: 48, height: 48, borderRadius: radii.md, alignItems: 'center',
    justifyContent: 'center', backgroundColor: colors.softAccent },
  title: { ...typography.sectionTitle, color: colors.text, flex: 1 },
  sectionTitle: { ...typography.cardTitle, color: colors.text },
  body: { ...typography.body, color: colors.text },
  muted: { ...typography.body, color: colors.muted },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: radii.md, backgroundColor: colors.softAccent },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg,
    marginBottom: spacing.md, borderRadius: radii.lg, backgroundColor: colors.softAccent },
  statusCardFulfilled: { backgroundColor: colors.soft },
  statusCardReadOnly: { backgroundColor: colors.border },
  statusCardPressed: { opacity: 0.78 },
  statusCardDisabled: { opacity: 0.5 },
  statusCopy: { flex: 1, gap: spacing.xs },
  statusLabel: { ...typography.caption, color: colors.muted },
  statusValue: { ...typography.cardTitle, color: colors.secondary },
  statusValueFulfilled: { color: colors.primary },
  statusValueReadOnly: { color: colors.muted },
  commentsCard: { marginTop: spacing.xl, gap: spacing.lg },
  commentsHeader: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  commentCount: { ...typography.caption, color: colors.muted },
  commentsList: { zIndex: 1 },
  commentsState: { minHeight: 90, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  retryLink: { ...typography.label, color: colors.primary, fontWeight: '600' },
  commentItem: { position: 'relative', paddingVertical: spacing.lg, gap: spacing.sm },
  commentItemDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  commentItemMenuOpen: { zIndex: 10 },
  commentAuthor: { ...typography.label, color: colors.primary, fontWeight: '600' },
  commentBody: { ...typography.body, color: colors.text },
  replyReference: { gap: 2, paddingLeft: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.soft },
  replyReferenceAuthor: { ...typography.caption, color: colors.secondary, fontWeight: '600' },
  replyReferenceText: { ...typography.caption, color: colors.muted },
  commentFooter: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  commentTime: { ...typography.caption, color: colors.muted },
  commentFooterSpacer: { flex: 1 },
  commentFooterButton: { width: 36, height: 36, borderRadius: radii.round, alignItems: 'center', justifyContent: 'center' },
  commentFooterButtonPressed: { backgroundColor: colors.softAccent, opacity: 0.72 },
  commentMenuAnchor: { position: 'relative' },
  commentMenu: { position: 'absolute', top: 38, right: 0, width: 178, padding: spacing.xs,
    borderRadius: radii.md, backgroundColor: colors.surface, zIndex: 20, ...shadow },
  commentMenuAction: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, borderRadius: radii.sm },
  commentMenuActionPressed: { backgroundColor: colors.softAccent },
  commentMenuText: { ...typography.label, color: colors.text },
  commentMenuDanger: { ...typography.label, color: colors.danger },
  commentActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  replyComposerContext: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.softAccent },
  replyComposerCopy: { flex: 1, minWidth: 0, gap: 2 },
  replyComposerAuthor: { ...typography.caption, color: colors.secondary, fontWeight: '600' },
  replyComposerText: { ...typography.caption, color: colors.muted },
  commentInput: { minHeight: 60, paddingTop: spacing.md, paddingBottom: spacing.md, textAlignVertical: 'center' },
  editCommentInput: { minHeight: 82, paddingTop: spacing.md, paddingBottom: spacing.md, textAlignVertical: 'top' },
  editCommentFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  commentCounter: { ...typography.caption, color: colors.muted },
  commentIconButton: { width: 34, height: 34, borderRadius: radii.round, alignItems: 'center',
    justifyContent: 'center', backgroundColor: colors.background },
  commentIconButtonPrimary: { width: 44, height: 44, backgroundColor: colors.primary },
  commentIconButtonDanger: { backgroundColor: colors.softAccent },
  commentIconButtonConfirm: { backgroundColor: colors.soft },
  commentIconButtonPressed: { opacity: 0.68, transform: [{ scale: 0.94 }] },
  commentIconButtonDisabled: { opacity: 0.42 },
  previewBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.lg },
  previewCard: { width: '100%', alignSelf: 'center', aspectRatio: 1, borderRadius: radii.xl,
    overflow: 'hidden', backgroundColor: colors.text },
  previewImage: { width: '100%', height: '100%' },
  previewClose: { position: 'absolute', top: spacing.md, right: spacing.md, zIndex: 2,
    width: 40, height: 40, borderRadius: radii.round, alignItems: 'center',
    justifyContent: 'center', backgroundColor: colors.overlay },
});
