import type { StatisticsData } from '@/services/statistics';
import type { DateEventIcon } from '@/types/domain';
import { toDateOnly } from '@/utils/dates';

export type HistoryPeriod = 'month' | 'year' | 'all';
export type CoupleMoment = {
  key: string; id: string; type: 'date' | 'wish'; title: string; date: string | null;
  category: string; icon: DateEventIcon;
};

export function summarizeStatistics(data: StatisticsData, period: HistoryPeriod, now = new Date()) {
  const today = toDateOnly(now);
  const start = period === 'month' ? `${today.slice(0, 7)}-01` : period === 'year' ? `${today.slice(0, 4)}-01-01` : '';
  const events = new Map(data.dates.map((event) => [event.id, event]));
  const moments: CoupleMoment[] = [];
  for (const completion of data.completions) {
    const event = events.get(completion.event_id);
    if (!event || completion.happened_on > today) continue;
    moments.push({ key: `date:${completion.id}`, id: event.id, type: 'date', title: event.title,
      date: completion.happened_on, category: event.category, icon: event.icon });
  }
  for (const wish of data.wishes) {
    if (!wish.fulfilled) continue;
    const timestamp = wish.fulfilled_at ? new Date(wish.fulfilled_at) : null;
    const date = timestamp && Number.isFinite(timestamp.getTime()) ? toDateOnly(timestamp) : null;
    if (date && date > today) continue;
    moments.push({ key: `wish:${wish.id}`, id: wish.id, type: 'wish', title: wish.title,
      date, category: wish.list, icon: 'sparkles' });
  }
  const selected = moments.filter((moment) => moment.date ? moment.date >= start : period === 'all')
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.key.localeCompare(b.key));
  const dates = selected.filter((moment) => moment.type === 'date');
  const wishes = selected.filter((moment) => moment.type === 'wish');
  const buckets: { key: string; label: string; fullLabel: string; count: number }[] = [];
  if (period === 'month') {
    const lastDay = now.getDate();
    for (let day = 1; day <= lastDay; day += 7) {
      const end = Math.min(day + 6, lastDay);
      const from = `${today.slice(0, 7)}-${String(day).padStart(2, '0')}`;
      const to = `${today.slice(0, 7)}-${String(end).padStart(2, '0')}`;
      buckets.push({ key: from, label: `${day}–${end}`, fullLabel: `${day}–${end} ${now.toLocaleDateString('ru-RU', { month: 'long' })}`,
        count: moments.filter((moment) => moment.date && moment.date >= from && moment.date <= to).length });
    }
  } else {
    const count = period === 'year' ? now.getMonth() + 1 : 12;
    for (let index = 0; index < count; index++) {
      const month = new Date(now.getFullYear(), period === 'year' ? index : now.getMonth() - 11 + index, 1, 12);
      const key = toDateOnly(month).slice(0, 7);
      buckets.push({ key, label: String(month.getMonth() + 1).padStart(2, '0'),
        fullLabel: month.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
        count: moments.filter((moment) => moment.date?.startsWith(key)).length });
    }
  }
  return {
    moments: selected, buckets, total: selected.length,
    dates: dates.filter((moment) => moment.category === 'dates').length,
    travels: dates.filter((moment) => moment.category === 'travel').length,
    otherEvents: dates.filter((moment) => moment.category !== 'dates' && moment.category !== 'travel').length,
    wishes: wishes.length,
    wishLists: Object.fromEntries(['together', 'creator', 'partner'].map((list) => [list, wishes.filter((moment) => moment.category === list).length])),
    undated: moments.filter((moment) => !moment.date).length,
  };
}
