import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { useApp } from '@/context/AppContext';
import { useDialog } from '@/context/DialogContext';
import { supabase } from '@/lib/supabase';
import { DateCategoryOption } from '@/types/domain';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export function DateCategoryPicker({ value, onChange, includeAll = false }: {
  value: string; onChange: (value: string) => void; includeAll?: boolean;
}) {
  const { categories, couple, refreshWorkspace } = useApp();
  const { showDialog } = useDialog();
  const [editor, setEditor] = useState<{ category?: DateCategoryOption } | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (action: 'add' | 'rename' | 'delete', category?: DateCategoryOption) => {
    if (!couple || !supabase || busy) return;
    setBusy(true);
    setError('');
    try {
      const { error: requestError } = await supabase.rpc('manage_date_category', {
        p_couple_id: couple.id, p_action: action, p_value: category?.value ?? null,
        p_label: action === 'delete' ? null : name.trim(),
      });
      if (requestError) throw requestError;
      await refreshWorkspace();
      setEditor(null);
    } catch (cause) {
      const message = (cause as { code?: string })?.code === '23505'
        ? 'Категория с таким названием уже есть.'
        : 'Не удалось обновить категории. Проверьте подключение и попробуйте ещё раз.';
      if (action === 'delete') showDialog({ title: 'Не удалось удалить категорию', message, tone: 'danger' });
      else setError(message);
    } finally {
      setBusy(false);
    }
  };

  return <>
    <View style={styles.grid}>
      {includeAll && <Pressable accessibilityRole="button" onPress={() => onChange('all')}
        style={[styles.chip, value === 'all' && styles.selected]}>
        <Text style={[styles.label, value === 'all' && styles.selectedLabel]}>Все</Text>
      </Pressable>}
      {categories.map((category) => <View key={category.value} style={[styles.group, value === category.value && styles.selected]}>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: value === category.value }}
          onPress={() => onChange(category.value)} style={styles.chip}>
          <Text style={[styles.label, value === category.value && styles.selectedLabel]}>{category.label}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Изменить категорию ${category.label}`}
          disabled={busy} style={styles.edit} onPress={() => {
            setName(category.label); setError(''); setEditor({ category });
          }}>
          <Ionicons name="ellipsis-horizontal" size={18} color={value === category.value ? colors.white : colors.primary} />
        </Pressable>
      </View>)}
      {categories.filter((item) => item.customSlot !== null).length < 2 &&
        <Pressable accessibilityRole="button" accessibilityLabel="Добавить категорию" disabled={busy}
          style={styles.add} onPress={() => { setName(''); setError(''); setEditor({}); }}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </Pressable>}
    </View>
    <Modal transparent animationType="fade" visible={editor !== null} onRequestClose={() => { if (!busy) setEditor(null); }}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.dialog}>
          <Text style={styles.heading}>{editor?.category ? 'Изменить категорию' : 'Новая категория'}</Text>
          <AppInput label="Название" value={name} onChangeText={setName} maxLength={40} editable={!busy} error={error} />
          <AppButton label="Сохранить" loading={busy} disabled={!name.trim()}
            onPress={() => void save(editor?.category ? 'rename' : 'add', editor?.category)} />
          {editor?.category && <AppButton label="Удалить категорию" variant="danger" disabled={busy} onPress={() => {
            const category = editor.category!;
            setEditor(null);
            showDialog({ title: `Удалить «${category.label}»?`,
              message: 'Категория и все даты в ней будут удалены у обоих партнёров. Восстановить их нельзя.',
              tone: 'warning', actions: [
                { label: 'Отмена', variant: 'ghost' },
                { label: 'Удалить категорию и даты', variant: 'danger', onPress: () => save('delete', category) },
              ] });
          }} />}
          <AppButton label="Отмена" variant="ghost" disabled={busy} onPress={() => setEditor(null)} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  group: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.softRose, borderRadius: radii.md, maxWidth: '100%', overflow: 'hidden' },
  chip: { minHeight: 44, paddingHorizontal: spacing.md, justifyContent: 'center', borderRadius: radii.md, flexShrink: 1 },
  selected: { backgroundColor: colors.primary },
  label: { ...typography.label, color: colors.primary },
  selectedLabel: { color: colors.white },
  edit: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  add: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softRose, borderRadius: radii.md },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.xl },
  dialog: { width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: colors.background, borderRadius: radii.xl, padding: spacing.xl, gap: spacing.md },
  heading: { ...typography.sectionTitle, color: colors.text },
});
