import { supabase } from '@/lib/supabase';
import type { DateCompletion } from '@/services/dateCompletions';
import type { DateEventIcon } from '@/types/domain';

export type StatisticsData = {
  wishes: { id: string; title: string; list: string; fulfilled: boolean; fulfilled_at: string | null }[];
  completions: DateCompletion[];
  dates: { id: string; title: string; icon: DateEventIcon; category: string }[];
};

// Fetch only the fields needed for counts, including every page rather than silently truncating at 1000.
async function readStatisticsRows<T>(table: string, columns: string, coupleId: string, signal: AbortSignal): Promise<T[]> {
  if (!supabase) throw new Error('Supabase не настроен');
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from(table).select(columns).eq('couple_id', coupleId)
      .order('id').range(offset, offset + 499).abortSignal(signal);
    if (error) throw error;
    rows.push(...data as unknown as T[]);
    if (data.length < 500) return rows;
  }
}

export async function loadStatistics(coupleId: string, signal: AbortSignal): Promise<StatisticsData> {
  const [wishes, completions, dates] = await Promise.all([
    readStatisticsRows<StatisticsData['wishes'][number]>('wishes', 'id,title,list,fulfilled,fulfilled_at', coupleId, signal),
    readStatisticsRows<StatisticsData['completions'][number]>('date_completions', 'id,event_id,happened_on', coupleId, signal),
    readStatisticsRows<StatisticsData['dates'][number]>('date_events', 'id,title,icon,category', coupleId, signal),
  ]);
  return { wishes, completions, dates };
}
