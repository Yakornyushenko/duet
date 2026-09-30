import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { AppButton } from '@/components/AppButton';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { loadStatistics, StatisticsData } from '@/services/statistics';
import { HistoryPeriod, summarizeStatistics } from '@/utils/statistics';
import { formatRelationshipDate, getDaysTogether, pluralizeDays } from '@/utils/dates';
import { getWishlists } from '@/utils/wishlists';
import { eventIcons } from '@/utils/eventIcons';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function StatisticsScreen() {
  const { user, couple, categories } = useApp();
  const [data, setData] = useState<StatisticsData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [period, setPeriod] = useState<HistoryPeriod>('all');
  const [limit, setLimit] = useState(20);

  useFocusEffect(useCallback(() => {
    if (!couple || !supabase) { setLoading(false); setError(true); return; }
    let active = true;
    let request: AbortController | undefined;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    setData(null); setLoading(true); setError(false);
    const load = async () => {
      request?.abort();
      const controller = new AbortController(); request = controller;
      try {
        const result = await loadStatistics(couple.id, controller.signal);
        if (active && !controller.signal.aborted) { setData(result); setError(false); }
      } catch { if (active && !controller.signal.aborted) setError(true); }
      finally { if (active && !controller.signal.aborted) setLoading(false); }
    };
    void load();
    const channel = supabase.channel(`statistics:${couple.id}`);
    for (const table of ['wishes', 'date_events', 'date_completions']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        clearTimeout(debounce); debounce = setTimeout(() => void load(), 350);
      });
    }
    channel.subscribe((status) => { if (status === 'SUBSCRIBED') void load(); });
    const foreground = AppState.addEventListener('change', (state) => { if (state === 'active') void load(); });
    return () => { active = false; request?.abort(); clearTimeout(debounce); foreground.remove(); void supabase?.removeChannel(channel); };
  }, [couple?.id, user?.id, revision]));

  const stats = useMemo(() => data ? summarizeStatistics(data, period) : null, [data, period]);
  const days = couple ? getDaysTogether(couple.relationshipStartedAt) : 0;
  const wishlists = getWishlists(user, couple);
  const periodLabel = period === 'month' ? 'В этом месяце' : period === 'year' ? 'В этом году' : 'За всё время';

  return <AppScreen contentContainerStyle={styles.screen}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Назад" onPress={() => router.canGoBack() ? router.back() : router.replace('/more')} style={styles.icon}>
        <Ionicons name="chevron-back" size={24} color={colors.primary} />
      </Pressable>
      <Text style={styles.title}>Наша история</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Обновить статистику" disabled={loading} onPress={() => setRevision((value) => value + 1)} style={styles.icon}>
        <Ionicons name="refresh-outline" size={22} color={colors.primary} />
      </Pressable>
    </View>
    <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <Text style={styles.heroCaption}>Уже вместе прожили</Text>
      <Text style={styles.heroNumber}>{days} <Text style={styles.heroUnit}>{pluralizeDays(days)}</Text></Text>
      {couple && <Text style={styles.heroCaption}>С {formatRelationshipDate(couple.relationshipStartedAt)}</Text>}
    </LinearGradient>
    <SegmentedControl value={period} onChange={(value) => { setPeriod(value); setLimit(20); }} options={[
      { value: 'month', label: 'Месяц' }, { value: 'year', label: 'Год' }, { value: 'all', label: 'Всё время' },
    ]} />
    <Text style={styles.caption}>{periodLabel} · только то, что уже состоялось</Text>
    {loading && <ActivityIndicator color={colors.primary} accessibilityLabel="Загружаем историю" />}
    {error && <View style={styles.card}><Text style={styles.copy}>Не удалось обновить историю. Проверьте подключение и настройку базы.{data ? ' Ниже — последние загруженные данные.' : ''}</Text><AppButton label="Повторить" variant="ghost" onPress={() => setRevision((value) => value + 1)} /></View>}
    {stats && <>
      <View style={styles.grid}>
        {[
          { label: categories.find((item) => item.value === 'dates')?.label ?? 'Свидания', count: stats.dates, icon: 'heart-outline' as const },
          { label: categories.find((item) => item.value === 'travel')?.label ?? 'Путешествия', count: stats.travels, icon: 'airplane-outline' as const },
          { label: 'Исполненные желания', count: stats.wishes, icon: 'sparkles-outline' as const },
          { label: 'Другие события', count: stats.otherEvents, icon: 'calendar-outline' as const },
        ].map((item) => <View key={item.icon} style={styles.metric}>
          <Ionicons name={item.icon} size={23} color={colors.primary} />
          <Text style={styles.metricNumber}>{item.count}</Text><Text style={styles.caption}>{item.label}</Text>
        </View>)}
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Наши желания сбылись</Text>
        {wishlists.map((list) => <View key={list.value} style={styles.row}>
          <Text style={styles.copy}>{list.label}</Text><Text style={styles.count}>{stats.wishLists[list.value]}</Text>
        </View>)}
        {stats.undated > 0 && <Text style={styles.caption}>Без известной даты выполнения: {stats.undated}. Они учтены только в «Всё время».</Text>}
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Моменты вместе</Text>
        <Text style={styles.caption}>{period === 'month' ? 'В этом месяце, по неделям' : period === 'year' ? 'В этом году, по месяцам' : 'Последние 12 месяцев'} · события и исполненные желания с известной датой</Text>
        <View style={styles.chart}>
          {stats.buckets.map((bucket) => <View key={bucket.key} style={styles.column} accessible accessibilityLabel={`${bucket.fullLabel}: ${bucket.count}`}>
            <Text style={styles.barNumber}>{bucket.count}</Text>
            <View style={styles.barTrack}><View style={[styles.bar, { height: `${bucket.count / Math.max(1, ...stats.buckets.map((item) => item.count)) * 100}%` }]} /></View>
            <Text style={styles.month}>{bucket.label}</Text>
          </View>)}
        </View>
      </View>
      <Text style={styles.sectionTitle}>Наши моменты</Text>
      {!stats.total && <View style={styles.card}>
        <Text style={styles.copy}>История начинается с ваших моментов</Text>
        <Text style={styles.caption}>Отметьте «Состоялось» в сохранённой дате или исполните желание — и оно появится здесь. Будущие планы и просто прошедшие даты не учитываются.</Text>
        <AppButton label="Открыть даты" variant="secondary" onPress={() => router.push('/dates')} />
      </View>}
      {stats.moments.slice(0, limit).map((moment) => <Pressable key={moment.key} accessibilityRole="button"
        onPress={() => router.push({ pathname: moment.type === 'date' ? '/date-form' : '/wish', params: { id: moment.id } })}
        style={({ pressed }) => [styles.card, styles.row, pressed && styles.pressed]}>
        <View style={styles.icon}><Ionicons name={eventIcons[moment.icon] ?? 'heart-outline'} size={23} color={colors.primary} /></View>
        <View style={styles.momentCopy}>
          <Text style={styles.momentTitle} numberOfLines={2}>{moment.title}</Text>
          <Text style={styles.caption}>{moment.type === 'wish' ? 'Желание исполнилось' : categories.find((category) => category.value === moment.category)?.label ?? 'Событие состоялось'}</Text>
          <Text style={styles.caption}>{moment.date ? formatRelationshipDate(moment.date) : 'Дата выполнения неизвестна'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>)}
      {stats.moments.length > limit && <AppButton label="Ещё моменты" variant="ghost" onPress={() => setLimit((value) => value + 20)} />}
      <Text style={styles.footnote}>В истории — ваши подтверждённые события и желания, отмеченные исполненными. Удаление записи или отмена отметки убирает её из итогов. Время вместе всегда показано за весь период отношений.</Text>
    </>}
  </AppScreen>;
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl }, header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { ...typography.sectionTitle, color: colors.text, flex: 1 },
  icon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.softRose, alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: radii.xl, padding: spacing.xxl, gap: spacing.sm },
  heroCaption: { ...typography.label, color: colors.white }, heroNumber: { fontSize: 42, fontWeight: '700', color: colors.white },
  heroUnit: { fontSize: 18, fontWeight: '500' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metric: { flexGrow: 1, flexBasis: '45%', backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  metricNumber: { fontSize: 30, fontWeight: '700', color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.md },
  sectionTitle: { ...typography.sectionTitle, color: colors.text }, caption: { ...typography.caption, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, copy: { ...typography.body, color: colors.text, flexShrink: 1, flexGrow: 1 },
  count: { ...typography.cardTitle, color: colors.secondary }, chart: { flexDirection: 'row', gap: 4, marginTop: spacing.sm },
  column: { flex: 1, alignItems: 'center', gap: spacing.xs }, barNumber: { fontSize: 11, color: colors.secondary },
  barTrack: { height: 80, width: '75%', justifyContent: 'flex-end', backgroundColor: colors.background, borderRadius: 4, overflow: 'hidden' },
  bar: { backgroundColor: colors.primary, borderRadius: 4, width: '100%' }, month: { fontSize: 10, color: colors.muted },
  momentCopy: { flex: 1, gap: spacing.xs }, momentTitle: { ...typography.cardTitle, color: colors.text },
  pressed: { opacity: 0.75 }, footnote: { ...typography.caption, color: colors.muted, textAlign: 'center' },
});
