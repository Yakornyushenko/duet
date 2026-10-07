import Ionicons from '@expo/vector-icons/Ionicons';
import { PencilIcon } from '@/components/PencilIcon';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { useApp } from '@/context/AppContext';
import { useDialog } from '@/context/DialogContext';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { supabase } from '@/lib/supabase';
import { DateCategoryOption } from '@/types/domain';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export function DateCategoryPicker({ value, onChange, includeAll = false, editable = false }: {
  value: string; onChange: (value: string) => void; includeAll?: boolean; editable?: boolean;
}) {
  const { categories, couple, refreshWorkspace } = useApp();
  const { showDialog } = useDialog();
  const { largeModalMaxWidth } = useResponsiveLayout();
  const [editor, setEditor] = useState<{ category?: DateCategoryOption } | null>(null);
  const [managerVisible, setManagerVisible] = useState(false);
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
    {editable && <View style={styles.header}>
      <Text style={styles.fieldLabel}>Категории</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Управление категориями"
        style={styles.edit} disabled={busy} onPress={() => setManagerVisible(true)}>
        <Ionicons name="ellipsis-horizontal" size={22} color={colors.primary} />
      </Pressable>
    </View>}
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
      </View>)}
    </View>
    <Modal transparent animationType="fade" visible={managerVisible} onRequestClose={() => {
      if (busy) return;
      if (editor) setEditor(null); else setManagerVisible(false);
    }}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.dialog, { maxWidth: largeModalMaxWidth }]}><ScrollView
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.dialogContent}
        >
          {!editor ? <>
            <Text style={styles.heading}>Категории</Text>
            {categories.map((category) => <Pressable key={category.value}
              accessibilityRole="button" accessibilityLabel={`Изменить категорию ${category.label}`}
              disabled={busy} style={styles.categoryRow} onPress={() => {
                setName(category.label); setError(''); setEditor({ category });
              }}>
              <Text style={styles.categoryName}>{category.label}</Text>
              <PencilIcon />
            </Pressable>)}
            {categories.length < 6 &&
              <AppButton label="Добавить категорию" disabled={busy} onPress={() => {
                setName(''); setError(''); setEditor({});
              }} />}
            <AppButton label="Готово" variant="ghost" disabled={busy} onPress={() => setManagerVisible(false)} />
          </> : <>
          <Text style={styles.heading}>{editor?.category ? 'Изменить категорию' : 'Новая категория'}</Text>
          <AppInput label="Название" value={name} onChangeText={setName} maxLength={40} editable={!busy} error={error} />
          <Text style={styles.notice}>{editor.category
            ? 'Новое название появится и в статистике у обоих партнёров. Даты и накопленные результаты сохранятся.'
            : 'Категория появится в статистике у обоих партнёров. Её сегмент в кольце появится, когда вы отметите первую состоявшуюся дату.'}</Text>
          <AppButton label="Сохранить" loading={busy} disabled={!name.trim()}
            onPress={() => void save(editor?.category ? 'rename' : 'add', editor?.category)} />
          {editor?.category && <AppButton label="Удалить категорию" variant="danger" disabled={busy} onPress={() => {
            const category = editor.category!;
            setEditor(null);
            setManagerVisible(false);
            showDialog({ title: `Удалить «${category.label}»?`,
              message: 'Категория, все даты в ней и отметки об их выполнении будут удалены у обоих партнёров. Эти события больше не будут учитываться в статистике: общий итог уменьшится на количество удалённых состоявшихся событий, а кольцо пересчитается. Восстановить данные нельзя.',
              tone: 'warning', actions: [
                { label: 'Отмена', variant: 'ghost' },
                { label: 'Удалить категорию и даты', variant: 'danger', onPress: () => save('delete', category) },
              ] });
          }} />}
          <AppButton label="Отмена" variant="ghost" disabled={busy} onPress={() => setEditor(null)} />
          </>}
        </ScrollView></View>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: { ...typography.label, color: colors.text },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48, paddingVertical: spacing.sm },
  categoryName: { ...typography.body, color: colors.text, flex: 1 },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.xl },
  dialog: { width: '100%', maxHeight: '85%', alignSelf: 'center', backgroundColor: colors.background, borderRadius: radii.xl },
  dialogContent: { padding: spacing.xl, gap: spacing.md },
  heading: { ...typography.sectionTitle, color: colors.text },
  notice: { ...typography.caption, color: colors.muted },
});
