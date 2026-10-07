import { AppIcon } from '@/components/AppIcon';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppScreen } from '@/components/AppScreen';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { NotePinIcon } from '@/components/NotePinIcon';
import { useApp } from '@/context/AppContext';
import { useDialog } from '@/context/DialogContext';
import { Note, noteContent, reconcileSavedNote, saveNote } from '@/services/notes';
import { colors, radii, spacing, typography } from '@/theme/tokens';

type Props = { initial: Note; remote?: Note; onSaved: (note: Note) => void; onClose: () => void };

export function NoteEditor({ initial, remote, onSaved, onClose }: Props) {
  const { user } = useApp();
  const { showDialog } = useDialog();
  const [draft, setDraft] = useState(initial);
  const current = useRef(initial);
  const saved = useRef(initial);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const blocked = useRef(false);
  const pending = useRef<Promise<boolean> | null>(null);
  const alive = useRef(true);
  const storageQueue = useRef(Promise.resolve());
  const trashView = Boolean(initial.deleted_at);
  const backupKey = `duet:note-draft:${user?.id}:${initial.couple_id}:${initial.id}`;
  const dirty = !saved.current.id || noteContent(draft) !== noteContent(saved.current);

  useEffect(() => {
    alive.current = true;
    if (trashView || !initial.id) {
      setReady(true);
      return () => { alive.current = false; };
    }
    void AsyncStorage.getItem(backupKey).then((value) => {
      if (!alive.current) return;
      if (value) {
        const recovered = JSON.parse(value) as Note;
        if (recovered.id === initial.id && recovered.couple_id === initial.couple_id &&
          typeof recovered.title === 'string' && typeof recovered.body === 'string' && Array.isArray(recovered.items) &&
          noteContent(recovered) !== noteContent(initial)) {
          current.current = recovered;
          setDraft(recovered);
          if (recovered.version !== initial.version) {
            blocked.current = true; setConflict(true);
            setError('Найден ваш черновик, но общая заметка уже изменилась. Сохраните черновик отдельной копией или загрузите общую версию.');
          }
        }
      }
    }).catch(() => { if (alive.current) setError('Не удалось восстановить локальный черновик.'); })
      .finally(() => { if (alive.current) setReady(true); });
    return () => { alive.current = false; };
  }, [backupKey, initial, trashView]);

  const change = (patch: Partial<Note>) => {
    const updated = { ...current.current, ...patch };
    current.current = updated;
    setDraft(updated);
  };

  const flush = useCallback((): Promise<boolean> => {
    if (pending.current) return pending.current;
    if (blocked.current) return Promise.resolve(false);
    const task = (async () => {
      setSaving(true);
      try {
        if (!saved.current.id || noteContent(current.current) !== noteContent(saved.current)) {
          const snapshot = { ...current.current, version: saved.current.version };
          const result = await saveNote(snapshot);
          saved.current = result;
          current.current = { ...reconcileSavedNote(current.current, snapshot, result), id: result.id };
          if (alive.current) { setDraft(current.current); onSaved(result); }
          if (!alive.current) return true;
        }
        await AsyncStorage.removeItem(backupKey);
        if (alive.current) setError('');
        return true;
      } catch (failure) {
        blocked.current = true;
        if (alive.current) {
          const isConflict = (failure as { code?: string }).code === '40001';
          setConflict(isConflict);
          setError(isConflict
            ? 'Партнёр уже изменил эту заметку. Ваш текст не перезаписан: сохраните его копией или загрузите общую версию.'
            : 'Изменения пока не отправлены. Проверьте интернет и повторите сохранение.');
        }
        return false;
      } finally { if (alive.current) setSaving(false); }
    })();
    pending.current = task;
    void task.finally(() => { pending.current = null; });
    return task;
  }, [onSaved, backupKey]);

  useEffect(() => {
    if (!ready || !remote || remote.id !== current.current.id || remote.version <= saved.current.version || pending.current) return;
    if (noteContent(current.current) === noteContent(saved.current)) {
      saved.current = remote; current.current = remote; setDraft(remote);
    }
  }, [remote, ready, saving]);

  const persistAndClose = async () => {
    try {
      await storageQueue.current.catch(() => {});
      if (noteContent(current.current) !== noteContent(saved.current)) {
        await AsyncStorage.setItem(backupKey, JSON.stringify(current.current));
      } else {
        await AsyncStorage.removeItem(backupKey);
      }
      onClose();
    } catch {
      setError('Не удалось сохранить черновик на устройстве. Скопируйте текст перед закрытием.');
    }
  };

  const close = async () => {
    if (saving || pending.current) return;
    if (trashView || !ready) { onClose(); return; }
    if (!dirty) { onClose(); return; }
    showDialog({ title: 'Выйти без сохранения?',
      message: 'Изменения не сохранятся. Чтобы сохранить заметку, вернитесь к ней и нажмите «Сохранить».',
      actions: [{ label: 'Продолжить редактирование', variant: 'ghost' },
        { label: 'Выйти без сохранения', variant: 'danger', onPress: async () => {
          await AsyncStorage.removeItem(backupKey);
          onClose();
        } }],
    });
  };

  const restore = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const result = await saveNote({ ...saved.current, deleted_at: null });
      onSaved(result);
      onClose();
    } catch {
      setError('Не удалось восстановить заметку. Возможно, партнёр уже изменил её. Вернитесь в список и попробуйте снова.');
    } finally { if (alive.current) setSaving(false); }
  };

  const copy = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const result = await saveNote({ ...current.current, id: '', version: 0, deleted_at: null,
        title: `${current.current.title || 'Без названия'} — копия`.slice(0, 120) });
      await storageQueue.current.catch(() => {});
      await AsyncStorage.removeItem(backupKey);
      onSaved(result); onClose();
    } catch { setError('Не удалось сохранить копию. Ваш текст остаётся здесь — попробуйте ещё раз.'); }
    finally { if (alive.current) setSaving(false); }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={() => void close()}>
      <AppScreen>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Закрыть заметку" onPress={() => void close()} style={styles.icon}>
            <AppIcon name="chevron-back" size={24} color={colors.primary} />
          </Pressable>
          <Text style={styles.status}>{trashView ? 'Заметка в корзине' : !ready ? 'Загрузка…' : saving ? 'Сохраняем…' : error ? 'Не синхронизировано' : dirty ? 'Есть изменения' : 'Сохранено'}</Text>
          {!trashView && <Pressable disabled={!ready || !!draft.deleted_at} accessibilityRole="button" accessibilityState={{ selected: draft.pinned }} accessibilityLabel={draft.pinned ? 'Открепить' : 'Закрепить'} onPress={() => change({ pinned: !draft.pinned })} style={styles.icon}>
            <NotePinIcon pinned={draft.pinned} />
          </Pressable>}
        </View>
        {trashView && <Text style={styles.trashHint}>Здесь можно посмотреть удалённую заметку. Чтобы изменить её, сначала восстановите.</Text>}
        {trashView && error ? <Text style={styles.error}>{error}</Text> : null}
        {!trashView && error ? <View style={styles.notice}>
          <Text style={styles.error}>{error}</Text>
          {!conflict && <AppButton label="Повторить сохранение" variant="ghost" disabled={saving} onPress={() => { blocked.current = false; void flush(); }} />}
          {conflict && <>
            <AppButton label="Сохранить мой вариант копией" loading={saving} onPress={() => void copy()} />
            <AppButton label="Загрузить общую версию" variant="ghost" onPress={() => showDialog({
              title: 'Заменить ваш черновик?', message: 'Несохранённые изменения будут заменены общей версией заметки.',
              actions: [{ label: 'Заменить', onPress: () => {
                if (!remote) return;
                saved.current = remote; current.current = remote; setDraft(remote);
                blocked.current = false; setConflict(false); setError('');
              } }, { label: 'Отмена', variant: 'ghost' }],
            })} />
          </>}
          <AppButton label="Закрыть и оставить черновик" variant="ghost" disabled={saving} onPress={() => void persistAndClose()} />
        </View> : null}
        <AppInput label="Название" placeholder="Без названия" value={draft.title} maxLength={120} editable={ready && !trashView && !draft.deleted_at} onChangeText={(title) => change({ title })} />
        <View style={styles.content}>
          {draft.kind === 'text' ? <AppInput label="" accessibilityLabel="Текст заметки" placeholder="Что хочется записать?" multiline textAlignVertical="top" style={styles.body}
            value={draft.body} maxLength={20000} editable={ready && !trashView && !draft.deleted_at} onChangeText={(body) => change({ body })} /> : <>
            {draft.items.map((item) => <View key={item.id} style={styles.row}>
              <Pressable disabled={!ready || trashView || !!draft.deleted_at} accessibilityRole="checkbox" accessibilityState={{ checked: item.done }} accessibilityLabel={item.text || 'Пункт списка'}
                onPress={() => change({ items: draft.items.map((entry) => entry.id === item.id ? { ...entry, done: !entry.done } : entry) })} style={styles.check}>
                <AppIcon name={item.done ? 'checkbox' : 'square-outline'} size={25} color={colors.primary} />
              </Pressable>
              <View style={styles.itemInput}><AppInput label="" accessibilityLabel="Текст пункта" placeholder="Новый пункт" value={item.text} maxLength={500}
                editable={ready && !trashView && !draft.deleted_at} style={item.done ? styles.done : undefined}
                onChangeText={(text) => change({ items: draft.items.map((entry) => entry.id === item.id ? { ...entry, text } : entry) })} /></View>
              {!trashView && !draft.deleted_at && <Pressable accessibilityRole="button" accessibilityLabel="Удалить пункт" style={styles.check}
                onPress={() => change({ items: draft.items.filter((entry) => entry.id !== item.id) })}><AppIcon name="close" size={20} color={colors.muted} /></Pressable>}
            </View>)}
            {!trashView && !draft.deleted_at && draft.items.length < 100 && <AppButton label="Добавить пункт" variant="ghost" disabled={!ready} onPress={() => change({ items: [...draft.items, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, text: '', done: false }] })} />}
          </>}
        </View>
        {!trashView && !draft.deleted_at && <AppButton
          label="Сохранить"
          loading={saving}
          disabled={!ready || conflict || (!dirty && !error)}
          onPress={() => {
            blocked.current = false;
            void flush();
          }}
        />}
        {saved.current.id && <View style={styles.footer}>
        {trashView || draft.deleted_at ? <AppButton label="Восстановить заметку" disabled={!ready || saving || conflict} onPress={() => void restore()} /> :
          <AppButton label="В корзину" variant="danger" disabled={!ready || saving || conflict} onPress={() => showDialog({
            title: 'Переместить в корзину?', message: 'Сохранённая версия заметки исчезнет из общего списка у вас обоих. Несохранённые изменения будут потеряны. Заметку можно будет восстановить.',
            actions: [{ label: 'В корзину', variant: 'danger', onPress: async () => {
              if (pending.current) return;
              setSaving(true);
              try {
                const result = await saveNote({ ...saved.current, deleted_at: new Date().toISOString() });
                await AsyncStorage.removeItem(backupKey);
                onSaved(result); onClose();
              } catch { setError('Не удалось переместить заметку в корзину. Попробуйте ещё раз.'); }
              finally { if (alive.current) setSaving(false); }
            } }, { label: 'Отмена', variant: 'ghost' }],
          })} />}
        </View>}
      </AppScreen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  trashHint: { ...typography.body, color: colors.muted, marginBottom: spacing.xl },
  footer: { marginTop: 'auto', paddingTop: spacing.xl, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.softRose },
  status: { ...typography.caption, flex: 1, color: colors.muted },
  content: { gap: spacing.sm, marginVertical: spacing.xl },
  body: { minHeight: 260, paddingTop: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  check: { width: 40, height: 48, alignItems: 'center', justifyContent: 'center' },
  itemInput: { flex: 1 }, done: { textDecorationLine: 'line-through', color: colors.muted },
  notice: { padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.softRose, gap: spacing.sm, marginBottom: spacing.lg },
  error: { ...typography.caption, color: colors.danger },
});
