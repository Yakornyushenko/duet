import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { NotesIcon } from '@/components/NotesIcon';
import { NotePinIcon } from '@/components/NotePinIcon';
import { isChecklistComplete } from '@/utils/notes';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { NoteEditor } from '@/components/NoteEditor';
import { useApp } from '@/context/AppContext';
import { useDialog } from '@/context/DialogContext';
import { supabase } from '@/lib/supabase';
import { emptyNotesTrash, listNotes, Note, saveNote } from '@/services/notes';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function NotesScreen() {
  const { user, couple } = useApp();
  const { showDialog } = useDialog();
  const [clearing, setClearing] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const [trash, setTrash] = useState(false);
  const [editor, setEditor] = useState<Note | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useFocusEffect(useCallback(() => {
    if (!couple || !supabase) { setLoading(false); return; }
    let active = true;
    let controller: AbortController | undefined;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const result = await listNotes(couple.id, request.signal);
        if (active && !request.signal.aborted) { setNotes(result); setError(''); }
      } catch {
        if (active && !request.signal.aborted) setError('Не удалось загрузить заметки. Проверьте подключение и настройку базы.');
      } finally {
        if (active && !request.signal.aborted) setLoading(false);
      }
    };
    void load();
    const channel = supabase.channel(`notes:${couple.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter: `couple_id=eq.${couple.id}` }, () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => void load(), 150);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notes' }, () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => void load(), 150);
      }).subscribe((status) => { if (status === 'SUBSCRIBED') void load(); });
    return () => { active = false; controller?.abort(); clearTimeout(debounce); void supabase?.removeChannel(channel); };
  }, [couple?.id, user?.id, revision]));

  const visibleNotes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return notes.filter((note) => Boolean(note.deleted_at) === trash &&
      [note.title, note.body, ...note.items.map((item) => item.text)].join('\n').toLocaleLowerCase().includes(query))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at));
  }, [notes, search, trash]);

  const create = async (kind: Note['kind']) => {
    if (!couple || creating) return;
    setCreating(true);
    try {
      const note = await saveNote({ id: '', couple_id: couple.id, kind, title: '', body: '', items: [],
        pinned: false, deleted_at: null, version: 0, updated_at: '', updated_by: user?.id ?? null });
      setNotes((current) => [note, ...current]);
      setEditor(note);
    } catch { setError('Не получилось создать заметку. Проверьте подключение и попробуйте снова.'); }
    finally { setCreating(false); }
  };

  return (
    <AppScreen scroll={false}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Назад" onPress={() => router.back()} style={styles.icon}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.title}>Заметки</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={trash ? 'Все заметки' : 'Корзина'} onPress={() => setTrash(!trash)} style={styles.icon}>
          {trash ? <NotesIcon /> : <Ionicons name="trash-outline" size={23} color={colors.primary} />}
        </Pressable>
      </View>
      <AppInput label="" accessibilityLabel="Поиск заметок" placeholder="Найти в наших заметках" value={search} onChangeText={setSearch} />
      {trash ? <Text style={styles.section}>Корзина · можно восстановить</Text> : (
        <View style={styles.actions}>
          <AppButton label="＋ Заметка" fullWidth={false} variant="secondary" disabled={creating} onPress={() => void create('text')} />
          <AppButton label="＋ Чек-лист" fullWidth={false} variant="secondary" disabled={creating} onPress={() => void create('checklist')} />
        </View>
      )}
      {error ? <View><Text style={styles.error}>{error}</Text><AppButton label="Повторить" variant="ghost" onPress={() => setRevision((v) => v + 1)} /></View> : null}
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      <FlatList
        data={visibleNotes} keyExtractor={(note) => note.id} style={styles.list}
        contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled"
        ListEmptyComponent={!loading && !error ? <Text style={styles.empty}>{search ? 'Ничего не найдено' : trash ? 'В корзине пока пусто' : 'Здесь будут наши идеи, списки и важные мелочи.'}</Text> : null}
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" onPress={() => setEditor(item)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
            <View style={styles.cardHeader}>
              <Ionicons name={item.kind === 'checklist' ? (isChecklistComplete(item) ? 'checkbox-outline' : 'square-outline') : 'document-text-outline'} size={21} color={colors.primary} />
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title.trim() || 'Без названия'}</Text>
              {item.pinned && <NotePinIcon pinned size={22} />}
            </View>
            <Text style={styles.preview} numberOfLines={3}>{item.kind === 'text' ? item.body || 'Пока без текста' : item.items.slice(0, 3).map((entry) => `${entry.done ? '☑' : '☐'} ${entry.text}`).join('\n') || 'Пока без пунктов'}</Text>
            <Text style={styles.meta}>{item.updated_by === user?.id ? user?.displayName : couple?.partnerName || 'Партнёр'} · {new Date(item.updated_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
          </Pressable>
        )}
      />
      {trash && <AppButton label="Очистить корзину" variant="danger" loading={clearing}
        disabled={loading || !couple || !notes.some((note) => note.deleted_at)}
        onPress={() => {
          const targets = notes.filter((note) => note.deleted_at);
          showDialog({
            title: 'Очистить корзину?',
            message: 'Все заметки в корзине, включая скрытые поиском, будут удалены навсегда у вас обоих. Восстановить их не получится.',
            tone: 'danger',
            actions: [{ label: 'Удалить навсегда', variant: 'danger', onPress: async () => {
              if (!couple || clearing) return;
              setClearing(true);
              try {
                const removed = new Set(await emptyNotesTrash(couple.id, targets));
                setNotes((current) => current.filter((note) => !removed.has(note.id)));
                setRevision((value) => value + 1);
                if (removed.size < targets.length) showDialog({ title: 'Корзина обновилась', message: 'Часть заметок уже изменена или восстановлена. Они не удалены.' });
              } catch { showDialog({ title: 'Не удалось очистить корзину', message: 'Проверьте подключение и попробуйте снова.', tone: 'danger' }); }
              finally { setClearing(false); }
            } }, { label: 'Отмена', variant: 'ghost' }],
          });
        }} />}
      {editor && <NoteEditor key={editor.id} initial={editor} remote={notes.find((note) => note.id === editor.id)}
        onClose={() => setEditor(null)} onSaved={(note) => setNotes((current) => [note, ...current.filter((item) => item.id !== note.id)])} />}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  title: { ...typography.title, color: colors.text, flex: 1 },
  icon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.softRose, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.lg },
  section: { ...typography.label, color: colors.muted, marginVertical: spacing.lg },
  error: { ...typography.caption, color: colors.danger },
  list: { flex: 1 }, listContent: { gap: spacing.md, paddingBottom: spacing.lg },
  card: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radii.lg, gap: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { ...typography.cardTitle, color: colors.text, flex: 1 },
  preview: { ...typography.body, color: colors.muted }, meta: { ...typography.caption, color: colors.muted },
  empty: { ...typography.body, color: colors.muted, textAlign: 'center', paddingVertical: spacing.xxxl },
  pressed: { transform: [{ scale: 1.01 }] },
});
