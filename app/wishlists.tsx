import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '@/components/AppScreen';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { useApp } from '@/context/AppContext';
import { useDialog } from '@/context/DialogContext';
import { supabase } from '@/lib/supabase';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { Wishlist, getWishlists } from '@/utils/wishlists';

type Wish = { id: string; title: string; list: Wishlist; fulfilled: boolean };

export default function WishlistsScreen() {
  const params = useLocalSearchParams<{ list?: string }>();
  const { user, couple } = useApp();
  const wishlists = getWishlists(user, couple);
  const { showDialog } = useDialog();
  const [list, setList] = useState<Wishlist>(wishlists.find((item) => item.value === params.list)?.value ?? 'together');
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [title, setTitle] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);

  useFocusEffect(useCallback(() => {
    const client = supabase;
    if (!client || !couple) { setLoading(false); setError(true); return; }
    let active = true;
    let request = 0;
    const load = async () => {
      const current = ++request;
      const result = await client.from('wishes').select('id, title, list, fulfilled')
        .eq('couple_id', couple.id).order('created_at', { ascending: false });
      if (!active || current !== request) return;
      setError(Boolean(result.error));
      if (!result.error) setWishes(result.data as Wish[]);
      setLoading(false);
    };
    setLoading(true);
    void load();
    const channel = client.channel(`wishes:${couple.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishes', filter: `couple_id=eq.${couple.id}` }, () => void load())
      .subscribe();
    return () => { active = false; void client.removeChannel(channel); };
  }, [couple?.id, revision]));

  const save = async (action: 'save' | 'toggle' | 'delete', wish?: Wish) => {
    if (!supabase || !couple || busy || (action === 'save' && !title.trim())) return;
    setBusy(true);
    try {
      const result = action === 'delete' && wish
        ? await supabase.from('wishes').delete().eq('id', wish.id).eq('couple_id', couple.id)
        : action === 'toggle' && wish
          ? await supabase.from('wishes').update({ fulfilled: !wish.fulfilled }).eq('id', wish.id).eq('couple_id', couple.id)
          : editing
            ? await supabase.from('wishes').update({ title: title.trim() }).eq('id', editing).eq('couple_id', couple.id)
            : await supabase.from('wishes').insert({ couple_id: couple.id, list, title: title.trim() });
      if (result.error) throw result.error;
      if (action === 'save' || wish?.id === editing) { setTitle(''); setEditing(null); }
      setRevision((current) => current + 1);
    } catch {
      showDialog({ title: 'Не получилось сохранить', message: 'Проверьте подключение и попробуйте ещё раз.', tone: 'danger' });
    } finally { setBusy(false); }
  };
  const visible = wishes.filter((wish) => wish.list === list).sort((a, b) => Number(a.fulfilled) - Number(b.fulfilled));

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Назад" onPress={() => router.back()} style={styles.icon}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.heading}>Наши желания</Text>
      </View>
      <Text style={styles.subtitle}>Маленькие радости и большие мечты</Text>
      <View style={styles.tabs}>
        {wishlists.map((item) => (
          <Pressable key={item.value} accessibilityRole="tab" accessibilityState={{ selected: list === item.value }}
            onPress={() => { setList(item.value); setEditing(null); setTitle(''); }}
            style={[styles.tab, list === item.value && styles.selected]}>
            <Ionicons name={item.icon} size={21} color={list === item.value ? colors.white : colors.primary} />
            <Text style={{ color: list === item.value ? colors.white : colors.secondary }}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      {error ? <View style={styles.card}>
        <Text style={styles.body}>Не удалось загрузить желания. Попробуйте ещё раз.</Text>
        <AppButton label="Повторить" onPress={() => setRevision((current) => current + 1)} />
      </View> : loading ? <Text style={styles.subtitle}>Загружаем желания…</Text> : <>
        <View style={styles.card}>
          <AppInput label={editing ? 'Изменить желание' : 'О чём мечтаете?'}
            placeholder={list === 'together' ? 'Встретить рассвет у моря'
              : list === 'creator' ? 'Прыжок с парашютом' : 'Теннисная ракетка'}
            value={title} onChangeText={setTitle} maxLength={200} />
          <AppButton label={editing ? 'Сохранить' : 'Добавить желание'} disabled={!title.trim()} loading={busy} onPress={() => void save('save')} />
          {editing ? <AppButton label="Отмена" variant="ghost" onPress={() => { setEditing(null); setTitle(''); }} /> : null}
        </View>
        {!visible.length ? <Text style={styles.empty}>Здесь найдётся место каждой мечте. Добавьте первое желание ♥</Text> : null}
        {visible.map((wish) => <View key={wish.id} style={styles.card}>
          <View style={styles.header}>
            <Pressable accessibilityRole="checkbox" accessibilityLabel={`Исполнено: ${wish.title}`} accessibilityState={{ checked: wish.fulfilled }}
              disabled={busy} onPress={() => void save('toggle', wish)} style={styles.icon}>
              <Ionicons name={wish.fulfilled ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={colors.primary} />
            </Pressable>
            <Text style={[styles.body, { flex: 1 }, wish.fulfilled && styles.done]}>{wish.title}</Text>
          </View>
          <View style={styles.header}>
            <AppButton label="Изменить" variant="ghost" disabled={busy} onPress={() => { setEditing(wish.id); setTitle(wish.title); }} />
            <AppButton label="Удалить" variant="ghost" disabled={busy} onPress={() => showDialog({
              title: 'Удалить желание?', message: 'Оно исчезнет из списка у вас обоих.', tone: 'warning',
              actions: [{ label: 'Удалить', variant: 'danger', onPress: () => save('delete', wish) }, { label: 'Отмена', variant: 'ghost' }],
            })} />
          </View>
        </View>)}
      </>}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.softRose },
  heading: { ...typography.sectionTitle, color: colors.text },
  subtitle: { ...typography.body, color: colors.muted, marginVertical: spacing.lg },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xxl },
  tab: { flex: 1, minHeight: 68, gap: spacing.xs, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softRose, borderRadius: radii.md },
  selected: { backgroundColor: colors.primary },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md, marginBottom: spacing.md },
  body: { ...typography.body, color: colors.text },
  empty: { ...typography.body, textAlign: 'center', color: colors.muted, paddingVertical: spacing.xxl },
  done: { textDecorationLine: 'line-through', color: colors.muted },
});
