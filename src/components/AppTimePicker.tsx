import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { colors, radii, spacing, typography } from '@/theme/tokens';

type AppTimePickerProps = {
  visible: boolean;
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
};

export function AppTimePicker({ visible, value, onSelect, onClose }: AppTimePickerProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) setDraft(/^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : '10:00');
  }, [visible, value]);

  const parts = draft.split(':');

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Отмена" onPress={onClose} />
        <View style={styles.card} accessibilityViewIsModal>
          <Text style={styles.title}>Время напоминания</Text>
          <Text style={styles.preview}>{draft}</Text>
          <View style={styles.columns}>
            {(['Часы', 'Минуты'] as const).map((label, column) => (
              <View key={label} style={styles.column}>
                <Text style={styles.label}>{label}</Text>
                <ScrollView
                  style={styles.list}
                  contentContainerStyle={styles.listContent}
                  contentOffset={{ x: 0, y: Math.max(0, Number(value.split(':')[column]) * 44 - 88) }}
                >
                  {Array.from({ length: column === 0 ? 24 : 60 }, (_, index) => {
                    const text = String(index).padStart(2, '0');
                    const selected = parts[column] === text;
                    return (
                      <Pressable
                        key={text}
                        accessibilityRole="radio"
                        accessibilityLabel={`${label}: ${text}`}
                        accessibilityState={{ checked: selected }}
                        onPress={() => setDraft(column === 0 ? `${text}:${parts[1]}` : `${parts[0]}:${text}`)}
                        style={[styles.option, selected && styles.selected]}
                      >
                        <Text style={[styles.number, selected && styles.selectedText]}>{text}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ))}
          </View>
          <AppButton label="Готово" onPress={() => { onSelect(draft); onClose(); }} />
          <AppButton label="Отмена" variant="ghost" onPress={onClose} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl, backgroundColor: colors.overlay },
  card: { width: '100%', maxWidth: 420, maxHeight: '100%', padding: spacing.xl, borderRadius: radii.xl, backgroundColor: colors.background, gap: spacing.md },
  title: { ...typography.sectionTitle, color: colors.text, textAlign: 'center' },
  preview: { ...typography.title, color: colors.primary, textAlign: 'center', fontVariant: ['tabular-nums'] },
  columns: { flexDirection: 'row', gap: spacing.lg, flexShrink: 1 },
  column: { flex: 1, flexShrink: 1, gap: spacing.sm },
  label: { ...typography.label, color: colors.muted, textAlign: 'center' },
  list: { height: 220, flexShrink: 1, borderRadius: radii.md, backgroundColor: colors.surface },
  listContent: { padding: spacing.xs },
  option: { height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm },
  selected: { backgroundColor: colors.primary },
  number: { ...typography.sectionTitle, color: colors.text, fontVariant: ['tabular-nums'] },
  selectedText: { color: colors.white },
});
