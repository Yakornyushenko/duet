import { dataCacheKey, loadWithCache, updateCachedData } from '@/lib/dataCache';
import { supabase } from '@/lib/supabase';

export type DateCompletion = { id: string; event_id: string; happened_on: string };

const completionsCacheKey = (eventId: string) => dataCacheKey('date-completions', eventId);

export async function listDateCompletions(eventId: string, signal: AbortSignal): Promise<DateCompletion[]> {
  return loadWithCache(completionsCacheKey(eventId), async () => {
    if (!supabase) throw new Error('Supabase не настроен');
    const { data, error } = await supabase.from('date_completions').select('id,event_id,happened_on')
      .eq('event_id', eventId).order('happened_on', { ascending: false }).abortSignal(signal);
    if (error) throw error;
    return data as DateCompletion[];
  }, signal);
}

export async function setDateCompletion(eventId: string, date: string, complete: boolean) {
  if (!supabase) throw new Error('Supabase не настроен');
  const { error } = await supabase.rpc('set_date_completion', { p_event_id: eventId, p_date: date, p_complete: complete });
  if (error) throw error;
  await updateCachedData<DateCompletion[]>(completionsCacheKey(eventId), (current) => {
    const withoutDate = current.filter((item) => item.happened_on !== date);
    if (!complete) return withoutDate;
    return [
      { id: `cached:${eventId}:${date}`, event_id: eventId, happened_on: date },
      ...withoutDate,
    ].sort((left, right) => right.happened_on.localeCompare(left.happened_on));
  });
}
