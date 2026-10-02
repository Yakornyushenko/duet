import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '@/components/AppScreen';
import { AppButton } from '@/components/AppButton';
import { QuestionCard } from '@/components/QuestionCard';
import { useApp } from '@/context/AppContext';
import { useDialog } from '@/context/DialogContext';
import { DailyQuestion, questionRequest } from '@/services/dailyQuestions';
import { colors, spacing, typography } from '@/theme/tokens';

export default function QuestionDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user, couple } = useApp();
  const { showDialog } = useDialog();
  const [question, setQuestion] = useState<DailyQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const request = generation.current;
    try {
      if (!id) throw new Error('Не указан вопрос');
      const result = await questionRequest<DailyQuestion | null>('daily_question_detail', { p_id: id });
      if (request !== generation.current) return;
      setQuestion(result); setError(result ? '' : 'Вопрос недоступен.');
    } catch { if (request === generation.current) setError('Не удалось загрузить вопрос. Попробуйте ещё раз.'); }
    finally { if (request === generation.current) setLoading(false); }
  }, [id, user?.id, couple?.id]);
  useFocusEffect(useCallback(() => {
    generation.current++; setQuestion(null); setLoading(true); setError('');
    void load();
    const timer = setInterval(() => { if (AppState.currentState === 'active') void load(); }, 20000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void load(); });
    return () => { generation.current++; clearInterval(timer); listener.remove(); };
  }, [load]));
  const perform = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try { await action(); await load(); }
    catch (cause) { showDialog({ title: 'Не удалось сохранить', message: cause instanceof Error ? cause.message : 'Попробуйте ещё раз.' }); }
    finally { setBusy(false); }
  };
  return <AppScreen contentContainerStyle={styles.screen}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Назад к вопросам" style={styles.back}
        onPress={() => router.canGoBack() ? router.back() : router.replace('/daily-question')}>
        <Ionicons name="chevron-back" size={26} color={colors.primary} />
      </Pressable>
      <Text style={styles.title}>Вопрос и ответы</Text>
    </View>
    {loading && <ActivityIndicator color={colors.primary} />}
    {!!error && <><Text style={styles.copy}>{error}</Text><AppButton label="Повторить" variant="secondary" onPress={() => void load()} /></>}
    {question && <QuestionCard key={`${user?.id}:${question.id}`} question={question} userId={user?.id ?? ''} busy={busy} perform={perform} />}
  </AppScreen>;
}
const styles = StyleSheet.create({
  screen: { gap: spacing.lg }, header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  back: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  title: { ...typography.sectionTitle, color: colors.text }, copy: { ...typography.body, color: colors.muted },
});
