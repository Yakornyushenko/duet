import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { DailyQuestion, questionRequest } from '@/services/dailyQuestions';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export function QuestionCard({ question, userId, busy, perform }: {
  question: DailyQuestion; userId: string; busy: boolean; perform: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const own = question.answers.find(item => item.user_id === userId);
  const [answer, setAnswer] = useState(own?.body ?? '');
  const [savedAnswer, setSavedAnswer] = useState<string | null>(own?.body ?? null);
  useEffect(() => { if (own) setSavedAnswer(own.body); }, [own?.body]);
  const unchanged = savedAnswer !== null && answer === savedAnswer;
  return <View style={styles.card}>
    <Text style={styles.copy}>{question.day}{question.intimate ? ' · Личный вопрос' : ''}</Text>
    <Text style={styles.heading}>{question.body}</Text>
    {question.cancelled || question.skipped ? <Text style={styles.copy}>{question.cancelled ? 'Согласие на личные вопросы отозвано. Новые вопросы будут обычными.' : 'Вопрос пропущен для пары. Ответы не раскрываются.'}</Text>
      : question.revealed ? question.answers.map(item => <View key={item.user_id} style={styles.answer}><Text style={styles.title}>{item.name}</Text><Text selectable style={styles.copy}>{item.body}</Text></View>)
        : <>
          {own && <Text style={styles.copy}>Твой ответ сохранён. Ждём ответ партнёра. До раскрытия его можно изменить.</Text>}
          <AppInput label="Твой ответ" placeholder="Поделись тем, что чувствуешь" value={answer} onChangeText={setAnswer} multiline maxLength={4000} editable={!busy} />
          <AppButton label={unchanged ? 'Изменения сохранены' : savedAnswer !== null ? 'Сохранить изменения' : 'Ответить'}
            disabled={!answer.trim() || busy || unchanged} loading={busy}
            onPress={() => void perform(async () => {
              const value = answer.trim();
              await questionRequest('answer_daily_question', { p_id: question.id, p_body: value });
              setSavedAnswer(value);
              setAnswer(value);
            })} />
        </>}
  </View>;
}
const styles = StyleSheet.create({
  heading: { ...typography.sectionTitle, color: colors.text }, title: { ...typography.cardTitle, color: colors.text },
  copy: { ...typography.body, color: colors.muted },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.md },
  answer: { backgroundColor: colors.softRose, borderRadius: radii.md, padding: spacing.lg, gap: spacing.sm },
});
