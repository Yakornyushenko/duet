import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppDatePicker } from '@/components/AppDatePicker';
import { useDialog } from '@/context/DialogContext';
import { DateCompletion, listDateCompletions, setDateCompletion } from '@/services/dateCompletions';
import { DateEvent } from '@/types/domain';
import { formatRelationshipDate, toDateOnly } from '@/utils/dates';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export function DateCompletionEditor({ event }: { event: DateEvent }) {
  const { showDialog } = useDialog();
  const [entries, setEntries] = useState<DateCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [picker, setPicker] = useState(false);
  const today = toDateOnly(new Date());

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void listDateCompletions(event.id, controller.signal).then((result) => {
      if (!controller.signal.aborted) { setEntries(result); setError(false); }
    }).catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [event.id, revision]);

  const record = async (date: string, complete: boolean) => {
    if (busy || date > today) return;
    setBusy(true);
    try { await setDateCompletion(event.id, date, complete); setRevision((value) => value + 1); }
    catch { showDialog({ title: 'Не получилось обновить историю', message: 'Проверьте подключение. Возможно, партнёр уже отметил это событие.', tone: 'warning' }); setRevision((value) => value + 1); }
    finally { setBusy(false); }
  };

  return <View style={styles.card}>
    <Text style={styles.title}>Наша история</Text>
    <Text style={styles.hint}>Отметьте, что событие состоялось. В статистику попадут только подтверждённые вами моменты.</Text>
    {error ? <AppButton label="Повторить загрузку" variant="ghost" onPress={() => setRevision((value) => value + 1)} /> : <>
      {entries.map((entry) => <View key={entry.id} style={styles.row}>
        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
        <Text style={styles.date}>{formatRelationshipDate(entry.happened_on)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Убрать отметку о состоявшемся событии" disabled={busy || loading} style={styles.remove}
          onPress={() => showDialog({ title: 'Убрать из истории?', message: 'Дата останется в календаре, но эта отметка исчезнет из статистики у вас обоих.',
            actions: [{ label: 'Убрать отметку', variant: 'danger', onPress: () => record(entry.happened_on, false) }, { label: 'Отмена', variant: 'ghost' }] })}>
          <Ionicons name="close" size={20} color={colors.muted} />
        </Pressable>
      </View>)}
      {(!entries.length || event.recurrence === 'yearly') && <AppButton label={entries.length ? 'Отметить ещё одну дату' : 'Состоялось'} variant="secondary" disabled={loading || busy} loading={busy} onPress={() => setPicker(true)} />}
    </>}
    <AppDatePicker visible={picker} title="Когда это было?" value={event.eventDate <= today ? event.eventDate : today} maximumDate={today}
      onSelect={(date) => { setPicker(false); void record(date, true); }} onClose={() => setPicker(false)} />
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  title: { ...typography.cardTitle, color: colors.text }, hint: { ...typography.caption, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, date: { ...typography.body, color: colors.text, flex: 1 },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
