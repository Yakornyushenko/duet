import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useDialog } from '@/context/DialogContext';
import { useApp } from '@/context/AppContext';
import { DailyQuestionState, loadDailyQuestions, questionRequest } from '@/services/dailyQuestions';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export function IntimateQuestionSettings() {
  const { user, couple } = useApp();
  const { showDialog } = useDialog();
  const [state, setState] = useState<DailyQuestionState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    setState(null); setError(false);
    void loadDailyQuestions().then(value => { if (active) setState(value); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [user?.id, couple?.id]));
  const change = async (enabled: boolean) => {
    setBusy(true);
    try {
      await questionRequest('set_question_preferences', { p_patch: enabled ? { intimate: true, adult_confirmed: true } : { intimate: false } });
      setState(await loadDailyQuestions());
    } catch (cause) { showDialog({ title: 'Не удалось сохранить', message: cause instanceof Error ? cause.message : 'Попробуйте ещё раз.' }); }
    finally { setBusy(false); }
  };
  return <View style={styles.card}>
    <View style={styles.row}>
      <Text style={styles.title}>Интимные вопросы · 18+</Text>
      <Switch accessibilityLabel="Интимные вопросы" value={state?.preferences.intimate ?? false}
        disabled={!state || busy} trackColor={{ false: colors.border, true: colors.soft }}
        thumbColor={state?.preferences.intimate ? colors.primary : colors.white} ios_backgroundColor={colors.border}
        onValueChange={enabled => enabled ? showDialog({ title: 'Личные темы — по согласию',
          message: 'Мне исполнилось 18 лет, и я хочу получать интимные вопросы. Они появятся только при согласии обоих. Можно отключить в любой момент. Ещё не раскрытые интимные вопросы при отключении отменяются.',
          actions: [{ label: 'Мне 18+, включить', onPress: () => change(true) }, { label: 'Отмена', variant: 'ghost' }],
        }) : void change(false)} />
    </View>
    <Text style={styles.copy}>{error ? 'Настройки недоступны. Проверьте подключение и миграцию «Вопрос дня».'
      : state?.intimate_active ? 'Включены у обоих — личные вопросы доступны.'
        : 'Доступны, когда включены у обоих партнёров. Текст интимного вопроса не показывается в уведомлении.'}</Text>
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: spacing.xl, borderRadius: radii.lg, backgroundColor: colors.surface, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.cardTitle, color: colors.text, flex: 1 },
  copy: { ...typography.caption, color: colors.muted },
});
