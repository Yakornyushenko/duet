import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useApp } from '@/context/AppContext';
import { useDialog } from '@/context/DialogContext';
import { DailyQuestionState, loadDailyQuestions, questionRequest } from '@/services/dailyQuestions';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export function IntimateQuestionSettings({ state: externalState, onRefresh }: {
  state?: DailyQuestionState;
  onRefresh?: () => Promise<unknown>;
} = {}) {
  const { couple } = useApp();
  const { showDialog } = useDialog();
  const [localState, setLocalState] = useState<DailyQuestionState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const controlled = externalState !== undefined;
  const state = externalState ?? localState;
  useFocusEffect(useCallback(() => {
    if (controlled) return undefined;
    let active = true;
    setLocalState(null); setError(false);
    if (!couple?.id) {
      setError(true);
      return () => { active = false; };
    }
    void loadDailyQuestions(couple.id)
      .then(value => { if (active) setLocalState(value); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [controlled, couple?.id]));
  const change = async (enabled: boolean) => {
    setBusy(true);
    try {
      await questionRequest('set_question_preferences', { p_patch: enabled ? { intimate: true, adult_confirmed: true } : { intimate: false } });
      if (onRefresh) await onRefresh();
      else if (couple?.id) setLocalState(await loadDailyQuestions(couple.id));
    } catch (cause) { showDialog({ title: 'Не удалось сохранить', message: cause instanceof Error ? cause.message : 'Попробуйте ещё раз.' }); }
    finally { setBusy(false); }
  };
  return <View style={styles.card}>
    <View style={styles.row}>
      <Text style={styles.title}>Личные вопросы · 18+</Text>
      <Switch accessibilityLabel="Личные вопросы" value={state?.preferences.intimate ?? false}
        disabled={!state || busy} trackColor={{ false: colors.border, true: colors.soft }}
        thumbColor={state?.preferences.intimate ? colors.primary : colors.white} ios_backgroundColor={colors.border}
        onValueChange={enabled => enabled ? showDialog({ title: 'Личные темы — по согласию',
          message: 'Мне исполнилось 18 лет, и я хочу получать личные вопросы. Переключатель меняет только мою настройку. Вопросы появятся при согласии обоих. Можно отключить в любой момент; ещё не раскрытые личные вопросы при этом отменяются.',
          actions: [{ label: 'Мне 18+, включить', onPress: () => change(true) }, { label: 'Отмена', variant: 'ghost' }],
        }) : void change(false)} />
    </View>
    <Text style={styles.copy}>{error ? 'Настройки недоступны. Проверьте подключение и попробуйте снова.'
      : !state ? 'Загружаем настройку…' : state.preferences.intimate ? 'Включены у вас' : 'Выключены у вас'}</Text>
    <Text style={styles.copy}>Личные вопросы доступны при согласии обоих.</Text>
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: spacing.xl, borderRadius: radii.lg, backgroundColor: colors.surface, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.cardTitle, color: colors.text, flex: 1 },
  copy: { ...typography.caption, color: colors.muted },
});
