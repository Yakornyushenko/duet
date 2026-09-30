import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { AppButton } from '@/components/AppButton';
import { SegmentedControl } from '@/components/SegmentedControl';
import { StatisticsRing } from '@/components/StatisticsRing';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { loadStatistics, StatisticsData } from '@/services/statistics';
import { HistoryPeriod, summarizeStatistics } from '@/utils/statistics';
import { formatRelationshipDate, getDaysTogether, pluralizeDays } from '@/utils/dates';
import { getWishlists } from '@/utils/wishlists';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function StatisticsScreen() {
  const { user, couple, categories } = useApp();
  const [data, setData] = useState<StatisticsData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [period, setPeriod] = useState<HistoryPeriod>('all');

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
  const categoryMetrics = categories.map((category) => ({
    id: category.value, label: category.label, count: stats?.categoryCounts[category.value] ?? 0,
    color: ({ dates: colors.primary, travel: colors.secondary, important: '#C48B67', other: '#B99AAC' } as Record<string, string>)[category.value]
      ?? (category.customSlot === 1 ? '#A67683' : '#9A9C72'),
  }));
  const ringSegments = [
    ...categoryMetrics,
    { id: 'fulfilled-wishes', label: 'Исполненные желания', count: stats?.wishes ?? 0, color: '#E8B7A5' },
  ];
  const days = couple ? getDaysTogether(couple.relationshipStartedAt) : 0;
  const wishlists = getWishlists(user, couple);

  return <AppScreen contentContainerStyle={styles.screen}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Назад" onPress={() => router.canGoBack() ? router.back() : router.replace('/more')} style={styles.icon}>
        <Ionicons name="chevron-back" size={24} color={colors.primary} />
      </Pressable>
      <Text style={styles.title}>Наша история</Text>
    </View>
    <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <Text style={styles.heroCaption}>Вместе</Text>
      <Text style={styles.heroNumber}>{days} <Text style={styles.heroUnit}>{pluralizeDays(days)}</Text></Text>
      {couple && <Text style={styles.heroCaption}>С {formatRelationshipDate(couple.relationshipStartedAt)}</Text>}
    </LinearGradient>
    <SegmentedControl value={period} onChange={setPeriod} options={[
      { value: 'month', label: 'Месяц' }, { value: 'year', label: 'Год' }, { value: 'all', label: 'Всё время' },
    ]} />
    {loading && <ActivityIndicator color={colors.primary} accessibilityLabel="Загружаем историю" />}
    {error && <View style={styles.card}><Text style={styles.copy}>Не удалось обновить историю. Проверьте подключение и настройку базы.{data ? ' Ниже — последние загруженные данные.' : ''}</Text><AppButton label="Повторить" variant="ghost" onPress={() => setRevision((value) => value + 1)} /></View>}
    {stats && <>
      <View style={styles.grid}>
        {[
          ...categoryMetrics,
          { id: 'fulfilled-wishes', label: 'Исполненные желания', count: stats.wishes, color: '#E8B7A5' },
        ].map((item) => <View key={item.id} style={styles.metric}>
          <Ionicons name={item.id === 'fulfilled-wishes' ? 'sparkles-outline' : item.id === 'dates' ? 'heart-outline' : item.id === 'travel' ? 'airplane-outline' : 'calendar-outline'} size={23} color={item.color} />
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
    </>}
    {stats && <StatisticsRing key={`${couple?.id}:${period}:${categories.map((category) => category.value).join(',')}`} segments={ringSegments} />}
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
  count: { ...typography.cardTitle, color: colors.secondary },
});
