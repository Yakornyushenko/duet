import { AppIcon } from '@/components/AppIcon';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, AppState, Easing, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { AppScreen } from '@/components/AppScreen';
import { AppButton } from '@/components/AppButton';
import { QuestionCard } from '@/components/QuestionCard';
import { AppTimePicker } from '@/components/AppTimePicker';
import { IntimateQuestionSettings } from '@/components/IntimateQuestionSettings';
import { useApp } from '@/context/AppContext';
import { useDialog } from '@/context/DialogContext';
import { DailyQuestion, DailyQuestionState, loadDailyQuestions, loadQuestionHistory, questionRequest } from '@/services/dailyQuestions';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function DailyQuestionScreen() {
  const { user, couple } = useApp();
  const { showDialog } = useDialog();
  const params = useLocalSearchParams<{ id?: string }>();
  const [state, setState] = useState<DailyQuestionState | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [timeVisible, setTimeVisible] = useState(false);
  const [older, setOlder] = useState<DailyQuestion[]>([]);
  const [more, setMore] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const historyLock = useRef(false);
  const cursors = useRef<string[]>([]);
  const [selected, setSelected] = useState<string | null>(params.id ?? null);
  useEffect(() => { setSelected(params.id ?? null); }, [params.id]);
  const scope = useRef(0);
  const loadedWorkspace = useRef('');
  const introShown = useRef(false);
  const refresh = useCallback(async () => {
    const request = scope.current;
    const requestedCursors = [...cursors.current];
    const next = await loadDailyQuestions();
    const pages = await Promise.all(requestedCursors.map(loadQuestionHistory));
    if (request === scope.current) {
      setState(next); setError('');
      if (cursors.current.length === requestedCursors.length) {
        setOlder(pages.flatMap(page => page.questions));
        setMore(pages.length ? pages[pages.length - 1].has_more : next.has_more);
      }
    }
    return next;
  }, []);
  const perform = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try { await action(); await refresh(); }
    catch (cause) { showDialog({ title: 'Не удалось сохранить', message: cause instanceof Error ? cause.message : 'Попробуйте ещё раз.' }); }
    finally { setBusy(false); }
  };
  useFocusEffect(useCallback(() => {
    scope.current++; introShown.current = false;
    const workspace = `${user?.id}:${couple?.id}`;
    if (loadedWorkspace.current !== workspace) {
      loadedWorkspace.current = workspace;
      setState(null); cursors.current = []; setOlder([]); setMore(false);
    }
    setError('');
    const current = scope.current;
    const load = () => { void refresh().then(next => {
      if (current !== scope.current || next.preferences.introduced || introShown.current) return;
      introShown.current = true;
      showDialog({ title: 'Один вопрос — два взгляда', dismissible: false,
        message: 'Каждый день — общий вопрос об отношениях. Ответы откроются, когда ответите оба. Время уведомления одно для пары. Можно поставить раздел на паузу. Личные вопросы каждый включает для себя отдельно; они доступны только по согласию обоих совершеннолетних партнёров.',
        actions: [{ label: 'Начать', onPress: async () => {
          try { await questionRequest('set_question_preferences', { p_patch: { introduced: true, enabled: true } }); await refresh(); }
          catch { introShown.current = false; setError('Не удалось включить вопросы. Попробуйте снова.'); }
        } }, { label: 'Пока не включать', variant: 'ghost', onPress: async () => {
          try { await questionRequest('set_question_preferences', { p_patch: { introduced: true } }); await refresh(); }
          catch { introShown.current = false; setError('Не удалось сохранить настройку.'); }
        } }],
      });
    }).catch(() => { if (current === scope.current) setError('Не удалось загрузить вопросы. Проверьте подключение и применение миграции.'); }); };
    load();
    const timer = setInterval(() => { if (AppState.currentState === 'active') load(); }, 20000);
    const foreground = AppState.addEventListener('change', value => { if (value === 'active') load(); });
    return () => { scope.current++; clearInterval(timer); foreground.remove(); };
  }, [couple?.id, user?.id, refresh, showDialog]));
  const history = [...new Map([...older, ...(state?.questions ?? [])].map(item => [item.id, item])).values()].sort((a,b) => b.day.localeCompare(a.day));
  const loadMore = async () => {
    const before = history[history.length - 1]?.day;
    if (!before || historyLock.current) return;
    historyLock.current = true; setHistoryBusy(true);
    const request = scope.current;
    try {
      const page = await loadQuestionHistory(before);
      if (request !== scope.current) return;
      cursors.current.push(before);
      setOlder(current => [...current, ...page.questions]); setMore(page.has_more);
    } catch { showDialog({ title: 'Не удалось загрузить историю', message: 'Нажмите «Ещё», чтобы повторить.' }); }
    finally { historyLock.current = false; setHistoryBusy(false); }
  };
  const question = selected ? history.find(item => item.id === selected)
    : state?.questions.find(item => item.day === state.today);
  return <AppScreen contentContainerStyle={styles.screen}>
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel="Назад" onPress={() => router.canGoBack() ? router.back() : router.replace('/more')}>
        <AppIcon name="chevron-back" size={26} color={colors.primary} />
      </Pressable>
      <Text style={styles.heading}>Вопрос дня</Text>
    </View>
    {error ? <View style={styles.card}><Text style={styles.copy}>{error}</Text><AppButton label="Повторить" onPress={() => void perform(refresh)} /></View> : null}
    {!state && !error && <ActivityIndicator color={colors.primary} />}
    {!couple?.partnerName && <View style={styles.card}><Text style={styles.title}>Разговор для двоих</Text><Text style={styles.copy}>Пригласи партнёра, чтобы отвечать на общие вопросы.</Text><AppButton label="Пригласить партнёра" onPress={() => router.push('/pair')} /></View>}
    {state && <>
      <View style={styles.card}>
        <View style={styles.row}><Text style={styles.flexTitle}>Ежедневные вопросы</Text><Switch accessibilityLabel="Ежедневные вопросы" disabled={busy}
          value={state.preferences.enabled} trackColor={{ false: colors.border, true: colors.soft }}
          thumbColor={state.preferences.enabled ? colors.primary : colors.white} ios_backgroundColor={colors.border}
          onValueChange={enabled => void perform(() => questionRequest('set_question_preferences', { p_patch: { enabled } }))} /></View>
        <Text style={styles.copy}>{state.active ? 'Включены у обоих' : `${state.preferences.enabled ? 'Ждём, когда партнёр включит вопросы' : 'Вопросы на паузе'}. История и текущий вопрос сохраняются.`}</Text>
        <AppButton label={`Общее время: ${state.time}`} variant="secondary" disabled={busy} onPress={() => setTimeVisible(true)} />
      </View>
      {question ? <QuestionCard key={`${couple?.id}:${question.id}`} question={question} userId={user?.id ?? ''} busy={busy} perform={perform} />
        : <View style={styles.card}><Text style={styles.copy}>{selected ? 'Этот вопрос пока не загружен. Откройте историю и нажмите «Ещё».' : state.active ? 'На сегодня нового вопроса нет. Все доступные вопросы уже пройдены — банк будет пополняться.' : 'Новый вопрос появится, когда вы оба включите раздел.'}</Text></View>}
      {selected && <AppButton label="К вопросу на сегодня" variant="ghost" onPress={() => setSelected(null)} />}
      <IntimateQuestionSettings />
      <QuestionHistory questions={history} onSelect={id => router.push({ pathname: '/question-detail', params: { id } })} hasMore={more} loading={historyBusy} onMore={() => void loadMore()} />
      <AppTimePicker visible={timeVisible} value={state.time} onClose={() => setTimeVisible(false)}
        onSelect={time => void perform(() => questionRequest('set_question_schedule', { p_time: time, p_timezone: state.timezone }))} />
    </>}
  </AppScreen>;
}

function QuestionHistory({ questions, onSelect, hasMore, loading, onMore }: {
  questions: DailyQuestion[]; onSelect: (id: string) => void; hasMore: boolean; loading: boolean; onMore: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [height, setHeight] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }).catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; listener.remove(); };
  }, []);
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: expanded ? 1 : 0, duration: reduceMotion ? 0 : 280,
      easing: Easing.inOut(Easing.cubic), useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [expanded, progress, reduceMotion]);
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Скрыть историю вопросов' : 'Открыть историю вопросов'}
      accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)}
      style={({ pressed }) => [styles.historyToggle, pressed && { opacity: 0.7 }]}>
      <Text style={styles.flexTitle}>История</Text>
      <Animated.View style={{ transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
        <AppIcon name="chevron-down" size={22} color={colors.primary} />
      </Animated.View>
    </Pressable>
    <Animated.View pointerEvents={expanded ? 'auto' : 'none'} accessibilityElementsHidden={!expanded}
      importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
      style={{ overflow: 'hidden', height: progress.interpolate({ inputRange: [0, 1], outputRange: [0, height] }) }}>
      <Animated.View onLayout={event => setHeight(event.nativeEvent.layout.height)}
        style={[styles.historyContent, { opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
        }]}>
        {!questions.length && <Text style={styles.copy}>Здесь появятся ваши вопросы.</Text>}
        {questions.map(item => <Pressable key={item.id} style={styles.card} onPress={() => onSelect(item.id)} accessibilityRole="button">
          <Text style={styles.copy}>{item.day} · {item.cancelled ? 'Отменён' : item.skipped ? 'Пропущен' : item.revealed ? 'Оба ответили' : `${item.answered_count} из 2 ответов`}</Text>
          <Text style={styles.title}>{item.body}</Text>
        </Pressable>)}
        {hasMore && <AppButton label="Ещё" variant="secondary" loading={loading} disabled={loading} onPress={onMore} />}
      </Animated.View>
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  historyToggle: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: spacing.lg, borderRadius: radii.md, backgroundColor: colors.surface },
  historyContent: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: spacing.md, gap: spacing.lg },
  screen: { gap: spacing.lg }, row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heading: { ...typography.sectionTitle, color: colors.text }, title: { ...typography.cardTitle, color: colors.text },
  flexTitle: { ...typography.cardTitle, color: colors.text, flex: 1 }, copy: { ...typography.body, color: colors.muted },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.md },
  answer: { backgroundColor: colors.softRose, borderRadius: radii.md, padding: spacing.lg, gap: spacing.sm },
});
