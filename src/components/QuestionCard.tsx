import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { useDialog } from '@/context/DialogContext';
import { DailyQuestion, questionRequest } from '@/services/dailyQuestions';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export function QuestionCard({ question, userId, busy, perform }: {
  question: DailyQuestion; userId: string; busy: boolean; perform: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const own = question.answers.find(item => item.user_id === userId);
  const [answer, setAnswer] = useState(own?.body ?? '');
  const { showDialog } = useDialog();
  return <View style={styles.card}>
    <Text style={styles.copy}>{question.day}{question.intimate ? ' · Личный вопрос' : ''}</Text>
    <Text style={styles.heading}>{question.body}</Text>
    {question.cancelled || question.skipped ? <Text style={styles.copy}>{question.cancelled ? 'Согласие на интимные темы отозвано. Новые вопросы будут обычными.' : 'Вопрос пропущен для пары. Ответы не раскрываются.'}</Text>
      : question.revealed ? question.answers.map(item => <View key={item.user_id} style={styles.answer}><Text style={styles.title}>{item.name}</Text><Text selectable style={styles.copy}>{item.body}</Text></View>)
        : <>
          {own && <Text style={styles.copy}>Твой ответ сохранён. Ждём ответ партнёра. До раскрытия его можно изменить.</Text>}
          <AppInput label="Твой ответ" placeholder="Поделись тем, что чувствуешь" value={answer} onChangeText={setAnswer} multiline maxLength={4000} editable={!busy} />
          <AppButton label={own ? 'Сохранить изменения' : 'Ответить'} disabled={!answer.trim() || busy} loading={busy}
            onPress={() => void perform(() => questionRequest('answer_daily_question', { p_id: question.id, p_body: answer }))} />
          <AppButton label="Пропустить вопрос" variant="ghost" disabled={busy} onPress={() => showDialog({ title: 'Пропустить для вас обоих?',
            message: 'Объяснять причину не нужно. Ответы на этот вопрос останутся закрытыми.',
            actions: [{ label: 'Пропустить', onPress: () => perform(() => questionRequest('answer_daily_question', { p_id: question.id, p_body: '', p_skip: true })) }, { label: 'Отмена', variant: 'ghost' }],
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

